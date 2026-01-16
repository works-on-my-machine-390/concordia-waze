package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func getGreetingString(c *gin.Context) {
	c.String(http.StatusOK, "hello world")
}

func getGreetingObject(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "hello world"})
}

func main() {

	router := gin.Default()
	router.GET("/index", getGreetingString)
	router.GET("/index/obj", getGreetingObject)
	router.Run("localhost:8080")

}
