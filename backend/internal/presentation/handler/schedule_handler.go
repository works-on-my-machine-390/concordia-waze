package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// ScheduleService defines the Firestore operations used by the schedule handler.

// ScheduleHandler handles course schedule endpoints.
type ScheduleHandler struct {
	service application.FirebaseClassService
}

type createCourseRequest struct {
	Name string `json:"name" binding:"required"`
}

// NewScheduleHandler creates a new ScheduleHandler.
func NewScheduleHandler(firebase application.FirebaseClassService) *ScheduleHandler {
	return &ScheduleHandler{service: firebase}
}

// CreateCourse godoc
// @Summary      Create a course
// @Description  Create an empty course container for a user
// @Tags         schedule
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        userId  path      string  true  "User ID"
// @Param        request body      createCourseRequest true "Course payload"
// @Success      201     {object}  map[string]string
// @Failure      400     {object}  map[string]string
// @Failure      401     {object}  map[string]string  "Not authenticated"
// @Failure      403     {object}  map[string]string  "Forbidden"
// @Failure      500     {object}  map[string]string
// @Router       /users/{userId}/courses [post]
func (h *ScheduleHandler) CreateCourse(c *gin.Context) {
	userID := c.Param("userId")

	var req createCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if err := h.service.CreateClass(c.Request.Context(), userID, req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "course created"})
}

// GetCourses godoc
// @Summary      Get all courses
// @Description  Get all courses with their nested class sessions for a user
// @Tags         schedule
// @Produce      json
// @Security     BearerAuth
// @Param        userId  path      string  true  "User ID"
// @Success      200     {array}   domain.CourseItem
// @Failure      401     {object}  map[string]string  "Not authenticated"
// @Failure      403     {object}  map[string]string  "Forbidden"
// @Failure      500     {object}  map[string]string
// @Router       /users/{userId}/courses [get]
func (h *ScheduleHandler) GetCourses(c *gin.Context) {
	userID := c.Param("userId")
	ctx := c.Request.Context()

	titles, err := h.service.GetUserClasses(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	courses := make([]domain.CourseItem, 0, len(titles))
	for _, title := range titles {
		items, err := h.service.GetClassItems(ctx, userID, title)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		courses = append(courses, domain.CourseItem{
			Name:    title,
			Classes: items,
		})
	}

	c.JSON(http.StatusOK, courses)
}

// DeleteCourse godoc
// @Summary      Delete a course
// @Description  Delete a course and all its class sessions
// @Tags         schedule
// @Produce      json
// @Security     BearerAuth
// @Param        userId  path      string  true  "User ID"
// @Param        title   path      string  true  "Course title"
// @Success      200     {object}  map[string]string
// @Failure      401     {object}  map[string]string  "Not authenticated"
// @Failure      403     {object}  map[string]string  "Forbidden"
// @Failure      500     {object}  map[string]string
// @Router       /users/{userId}/courses/{title} [delete]
func (h *ScheduleHandler) DeleteCourse(c *gin.Context) {
	userID := c.Param("userId")
	title := c.Param("title")

	if err := h.service.DeleteClass(c.Request.Context(), userID, title); err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "course deleted"})
}

// AddClassItem godoc
// @Summary      Add a class to a course
// @Description  Add a class session (lecture, lab, tutorial) to an existing course
// @Tags         schedule
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        userId  path      string           true  "User ID"
// @Param        title   path      string           true  "Course title"
// @Param        item    body      domain.ClassItem true  "Class session"
// @Success      201     {object}  map[string]string
// @Failure      400     {object}  map[string]string
// @Failure      401     {object}  map[string]string  "Not authenticated"
// @Failure      403     {object}  map[string]string  "Forbidden"
// @Failure      500     {object}  map[string]string
// @Router       /users/{userId}/courses/{title}/classes [post]
func (h *ScheduleHandler) AddClassItem(c *gin.Context) {
	userID := c.Param("userId")
	title := c.Param("title")

	var item domain.ClassItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	classID, err := h.service.AddClassItem(c.Request.Context(), userID, title, item)
	if err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "class added", "classId": classID})
}

// UpdateClassItem godoc
// @Summary      Update a class session
// @Description  Update fields of a specific class session within a course
// @Tags         schedule
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        userId   path      string                 true  "User ID"
// @Param        title    path      string                 true  "Course title"
// @Param        classId  path      string                 true  "Class ID"
// @Param        updates  body      map[string]interface{} true  "Fields to update"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      401      {object}  map[string]string  "Not authenticated"
// @Failure      403      {object}  map[string]string  "Forbidden"
// @Failure      500      {object}  map[string]string
// @Router       /users/{userId}/courses/{title}/classes/{classId} [put]
func (h *ScheduleHandler) UpdateClassItem(c *gin.Context) {
	userID := c.Param("userId")
	title := c.Param("title")
	classID := c.Param("classId")

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.service.UpdateClassItem(c.Request.Context(), userID, title, classID, updates); err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "class updated"})
}

// DeleteClassItem godoc
// @Summary      Delete a class session
// @Description  Delete a specific class session from a course
// @Tags         schedule
// @Produce      json
// @Security     BearerAuth
// @Param        userId   path      string  true  "User ID"
// @Param        title    path      string  true  "Course title"
// @Param        classId  path      string  true  "Class ID"
// @Success      200      {object}  map[string]string
// @Failure      401      {object}  map[string]string  "Not authenticated"
// @Failure      403      {object}  map[string]string  "Forbidden"
// @Failure      500      {object}  map[string]string
// @Router       /users/{userId}/courses/{title}/classes/{classId} [delete]
func (h *ScheduleHandler) DeleteClassItem(c *gin.Context) {
	userID := c.Param("userId")
	title := c.Param("title")
	classID := c.Param("classId")

	if err := h.service.DeleteClassItem(c.Request.Context(), userID, title, classID); err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
}
