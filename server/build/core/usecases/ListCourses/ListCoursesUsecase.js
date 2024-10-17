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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCoursesUsecase = void 0;
class ListCoursesUsecase {
    constructor(courseRepo) {
        this.courseRepo = courseRepo;
        this.exec = () => __awaiter(this, void 0, void 0, function* () {
            const courses = yield this.courseRepo.listCourses();
            const coursesWithDuration = courses.map((course) => {
                const duration = course.lessons.reduce((acc, lesson) => acc + lesson.duration, 0);
                return Object.assign(Object.assign({}, course), { duration });
            });
            return coursesWithDuration;
        });
    }
}
exports.ListCoursesUsecase = ListCoursesUsecase;
//# sourceMappingURL=ListCoursesUsecase.js.map