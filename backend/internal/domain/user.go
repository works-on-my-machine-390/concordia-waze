package domain

// User represents a student in the system
type User struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	StudentID string      `json:"student_id"`
	Email     string      `json:"email"`
	Password  string      `json:"-"`
}

// UserClaims represents the JWT claims for a user
type UserClaims struct {
	ID        string `json:"id"`
	StudentID string `json:"student_id"`
	Email     string `json:"email"`
}
