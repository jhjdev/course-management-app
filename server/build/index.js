"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ListCoursesUsecase_1 = require("./core/usecases/ListCourses/ListCoursesUsecase");
const MockRepos_1 = require("./mock_db/MockRepos");
const ListCourseBookmarksUsecase_1 = require("./core/usecases/ListCourseBookmarks/ListCourseBookmarksUsecase");
const app = (0, express_1.default)();
const port = 3000;
// Instantiate repos
const mockRepos = new MockRepos_1.MockRepos();
// Instantiate usecases
const listCoursesUsecase = new ListCoursesUsecase_1.ListCoursesUsecase(mockRepos.courses);
const listCourseBookmarksUsecase = new ListCourseBookmarksUsecase_1.ListCourseBookmarksUsecase(mockRepos.bookmarks);
app.get("/info", (_req, res) => {
    return res.send({
        name: "Octopus Backend",
        version: "1.0.0",
    });
});
app.get("/courses", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const courses = yield listCoursesUsecase.exec();
    return res.send(courses);
}));
app.get("/bookmarks", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // The user id is hardcoded for simplicity
    const userId = "userId";
    const courseBookmarks = yield listCourseBookmarksUsecase.exec(userId);
    return res.send(courseBookmarks);
}));
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map