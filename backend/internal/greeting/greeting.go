package greeting

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// @Summary Get greeting string
// @Description Returns a simple greeting string
// @Tags greeting
// @Produce plain
// @Success 200 {string} string "hello world"
// @Router /index [get]
func GetGreetingString(c *gin.Context) {
	c.String(http.StatusOK, generateGreeting())
}

func generateGreeting() string {
	return "hello world"
}

// @Summary Get greeting object
// @Description Returns a greeting message as JSON object
// @Tags greeting
// @Produce json
// @Success 200 {object} map[string]string
// @Router /index/obj [get]
func GetGreetingObject(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": generateGreeting()})
}
