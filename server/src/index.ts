import express, { Express, Request, Response } from "express";
import { ListCoursesUsecase } from "./core/usecases/ListCourses/ListCoursesUsecase";
import { MockRepos } from "./mock_db/MockRepos";
import { ListCourseBookmarksUsecase } from "./core/usecases/ListCourseBookmarks/ListCourseBookmarksUsecase";

const app: Express = express();
const port = 3000;

// Instantiate repos
const mockRepos = new MockRepos();

// Instantiate usecases
const listCoursesUsecase = new ListCoursesUsecase(mockRepos.courses);
const listCourseBookmarksUsecase = new ListCourseBookmarksUsecase(
  mockRepos.bookmarks
);

app.get("/info", (_req: Request, res: Response) => {
  return res.send({
    name: "Octopus Backend",
    version: "1.0.0",
  });
});

app.get("/courses", async (_req: Request, res: Response) => {
  const courses = await listCoursesUsecase.exec();
  return res.send(courses);
});

app.get("/bookmarks", async (_req: Request, res: Response) => {
  // The user id is hardcoded for simplicity
  const userId = "userId";
  const courseBookmarks = await listCourseBookmarksUsecase.exec(userId);
  return res.send(courseBookmarks);
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
