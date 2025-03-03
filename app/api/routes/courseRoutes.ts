import { Router } from 'express';
import { CourseController } from '../controllers/courseController';

export class CourseRoutes {
private router: Router;
private courseController: CourseController;

constructor(courseController: CourseController) {
    this.router = Router();
    this.courseController = courseController;
    this.initializeRoutes();
}

private initializeRoutes(): void {
    // Course CRUD routes
    this.router.get('/', this.courseController.getAllCourses);
    this.router.get('/:id', this.courseController.getCourseById);
    this.router.post('/', this.courseController.createCourse);
    this.router.put('/:id', this.courseController.updateCourse);
    this.router.delete('/:id', this.courseController.deleteCourse);

    // Course progress routes
    this.router.post('/:id/progress', this.courseController.updateProgress);
    this.router.get('/:id/progress', this.courseController.getProgress);

    // Analytics route
    this.router.get('/analytics', this.courseController.getAnalytics);
}

public getRouter(): Router {
    return this.router;
}
}

// Factory function to create router instance
export const createCourseRouter = (courseController: CourseController): Router => {
return new CourseRoutes(courseController).getRouter();
};

