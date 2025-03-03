import { Client } from '@elastic/elasticsearch';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { injectable } from 'tsyringe';
import { Course } from '../models/Course';
import { User } from '../models/User';
import { SearchResult, SearchOptions, SearchFilters } from '../types/search';
import { RedisClient } from '../lib/redis';
import { Logger } from '../utils/logger';
import { SearchError } from '../utils/errors';

/**
* @class SearchService
* @description Service responsible for handling all search-related operations including full-text search,
* autocomplete, analytics, and index management. Uses Elasticsearch as primary search engine with Redis caching.
* 
* MongoDB Index Recommendations:
* ```javascript
* db.courses.createIndex({
*   title: "text",
*   description: "text",
*   tags: "text",
*   category: "text"
* }, {
*   weights: {
*     title: 10,
*     description: 5,
*     tags: 3,
*     category: 2
*   },
*   name: "courses_text_search"
* })
* ```
*/
@injectable()
export class SearchService {
private readonly elasticsearch: Client;
private readonly redis: RedisClient;
private readonly logger: Logger;

constructor(
    elasticsearch: Client,
    redis: RedisClient,
    logger: Logger
) {
    this.elasticsearch = elasticsearch;
    this.redis = redis;
    this.logger = logger;
}

/**
* Performs a full-text search across courses and materials
* @param query - The search query string
* @param options - Search options including filters, pagination, and sorting
* @returns Promise<SearchResult> - Search results with highlighting and aggregations
* @throws {SearchError} When search operation fails
*/
async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
    const cacheKey = this.generateCacheKey(query, options);
    const cachedResult = await this.getCachedResult(cacheKey);
    if (cachedResult) return cachedResult;

    const searchQuery = this.buildSearchQuery(query, options);
    const result = await this.elasticsearch.search(searchQuery);
    
    const formattedResult = this.formatSearchResult(result);
    await this.cacheResult(cacheKey, formattedResult);
    await this.trackSearch(query, options);

    return formattedResult;
    } catch (error) {
    this.logger.error('Search operation failed', { error, query, options });
    throw new SearchError('Failed to perform search operation');
    }
}

/**
* Provides search suggestions and autocomplete functionality
* @param query - Partial search query for suggestions
* @returns Promise<string[]> - Array of suggestion strings
* @throws {SearchError} When suggestion operation fails
*/
async suggest(query: string): Promise<string[]> {
    try {
    const suggestions = await this.elasticsearch.search({
        index: 'courses',
        body: {
        suggest: {
            course_suggest: {
            prefix: query,
            completion: {
                field: 'suggest',
                fuzzy: {
                fuzziness: 2
                },
                size: 5
            }
            }
        }
        }
    });

    return this.formatSuggestions(suggestions);
    } catch (error) {
    this.logger.error('Suggestion operation failed', { error, query });
    throw new SearchError('Failed to get search suggestions');
    }
}

/**
* Indexes a single course in the search engine
* @param course - Course object to index
* @throws {SearchError} When indexing operation fails
*/
async indexCourse(course: Course): Promise<void> {
    try {
    await this.elasticsearch.index({
        index: 'courses',
        id: course.id,
        body: this.prepareCourseForIndexing(course)
    });
    } catch (error) {
    this.logger.error('Course indexing failed', { error, courseId: course.id });
    throw new SearchError('Failed to index course');
    }
}

async updateSearchIndex(course: Course): Promise<void> {
    try {
    await this.elasticsearch.update({
        index: 'courses',
        id: course.id,
        body: {
        doc: this.prepareCourseForIndexing(course)
        }
    });
    } catch (error) {
    this.logger.error('Search index update failed', { error, courseId: course.id });
    throw new SearchError('Failed to update search index');
    }
}

async deleteFromIndex(courseId: string): Promise<void> {
    try {
    await this.elasticsearch.delete({
        index: 'courses',
        id: courseId
    });
    } catch (error) {
    this.logger.error('Failed to delete from search index', { error, courseId });
    throw new SearchError('Failed to delete from search index');
    }
}

private buildSearchQuery(query: string, options: SearchOptions) {
    const { filters, page = 1, limit = 10, sort } = options;

    return {
    index: 'courses',
    body: {
        from: (page - 1) * limit,
        size: limit,
        query: {
        bool: {
            must: [
            {
                multi_match: {
                query,
                fields: ['title^3', 'description^2', 'category', 'tags'],
                fuzziness: 'AUTO'
                }
            },
            ...this.buildFilters(filters)
            ]
        }
        },
        sort: this.buildSortCriteria(sort),
        highlight: {
        fields: {
            title: {},
            description: {}
        }
        }
    }
    };
}

private async trackSearch(query: string, options: SearchOptions): Promise<void> {
    try {
    await this.elasticsearch.index({
        index: 'search_analytics',
        body: {
        query,
        options,
        timestamp: new Date(),
        results_count: options.totalResults
        }
    });
    } catch (error) {
    this.logger.error('Failed to track search', { error, query });
    }
}

private prepareCourseForIndexing(course: Course) {
    return {
    title: course.title,
    description: course.description,
    category: course.category,
    tags: course.tags,
    difficulty: course.difficulty,
    instructor: course.instructor.name,
    price: course.price,
    rating: course.rating,
    enrollmentCount: course.enrollmentCount,
    updatedAt: course.updatedAt,
    suggest: {
        input: [
        course.title,
        course.category,
        ...course.tags
        ]
    }
    };
}

private buildFilters(filters?: SearchFilters) {
    if (!filters) return [];

    const filterQueries = [];
    
    if (filters.category) {
    filterQueries.push({ term: { category: filters.category } });
    }
    if (filters.difficulty) {
    filterQueries.push({ term: { difficulty: filters.difficulty } });
    }
    if (filters.priceRange) {
    filterQueries.push({
        range: {
        price: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max
        }
        }
    });
    }
    if (filters.rating) {
    filterQueries.push({
        range: {
        rating: {
            gte: filters.rating
        }
        }
    });
    }

    return filterQueries;
}

private buildSortCriteria(sort?: { field: string; order: 'asc' | 'desc' }) {
    if (!sort) return [{ _score: 'desc' }];

    return [
    { [sort.field]: sort.order },
    { _score: 'desc' }
    ];
}

private formatSearchResult(result: SearchResponse): SearchResult {
    return {
    hits: result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        highlight: hit.highlight,
        ...hit._source
    })),
    total: result.hits.total as number,
    aggregations: result.aggregations
    };
}

private async getCachedResult(key: string): Promise<SearchResult | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
}

private async cacheResult(key: string, result: SearchResult): Promise<void> {
    await this.redis.setex(key, 300, JSON.stringify(result));
}

private generateCacheKey(query: string, options: SearchOptions): string {
    return `search:${query}:${JSON.stringify(options)}`;
}

private formatSuggestions(suggestions: SearchResponse): string[] {
    return suggestions.suggest?.course_suggest[0].options.map(option => option.text) || [];
}
/**
* Bulk index multiple courses for improved performance
* @param courses - Array of courses to index
* @throws {SearchError} When bulk indexing operation fails
*/
async bulkIndexCourses(courses: Course[]): Promise<void> {
try {
    const body = courses.flatMap(course => [
    { index: { _index: 'courses', _id: course.id } },
    this.prepareCourseForIndexing(course)
    ]);

    await this.elasticsearch.bulk({ body });
} catch (error) {
    this.logger.error('Bulk course indexing failed', { error, courseCount: courses.length });
    throw new SearchError('Failed to bulk index courses');
}
}

/**
* Get search analytics and statistics
* @param period - Time period for analytics (e.g., 'day', 'week', 'month')
* @returns Promise<SearchAnalytics>
*/
async getSearchAnalytics(period: string): Promise<SearchAnalytics> {
try {
    const result = await this.elasticsearch.search({
    index: 'search_analytics',
    body: {
        query: {
        range: {
            timestamp: {
            gte: `now-1${period}`
            }
        }
        },
        aggs: {
        popular_queries: {
            terms: { field: 'query.keyword', size: 10 }
        },
        avg_results: {
            avg: { field: 'results_count' }
        },
        queries_over_time: {
            date_histogram: {
            field: 'timestamp',
            calendar_interval: '1d'
            }
        }
        }
    }
    });

    return this.formatAnalytics(result);
} catch (error) {
    this.logger.error('Failed to get search analytics', { error, period });
    throw new SearchError('Failed to retrieve search analytics');
}
}

/**
* Refresh the search index to make new documents immediately available
* @throws {SearchError} When refresh operation fails
*/
async refreshIndex(): Promise<void> {
try {
    await this.elasticsearch.indices.refresh({ index: 'courses' });
} catch (error) {
    this.logger.error('Failed to refresh search index', { error });
    throw new SearchError('Failed to refresh search index');
}
}

private formatAnalytics(result: SearchResponse): SearchAnalytics {
return {
    popularQueries: result.aggregations?.popular_queries?.buckets || [],
    averageResults: result.aggregations?.avg_results?.value || 0,
    queryTrends: result.aggregations?.queries_over_time?.buckets || []
};
}
}

/**
* Interface for search analytics results
*/
interface SearchAnalytics {
popularQueries: Array<{ key: string; doc_count: number }>;
averageResults: number;
queryTrends: Array<{ key_as_string: string; doc_count: number }>;
}
