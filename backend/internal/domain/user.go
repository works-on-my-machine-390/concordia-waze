package domain

// User represents a user in the system
type User struct {
	ID       string `firestore:"userId" json:"id"`
	Name     string `firestore:"Name" json:"name"`
	Email    string `firestore:"Email" json:"email"`
	Password string `firestore:"Password" json:"-"`
}

// UserClaims represents the JWT claims for a user
type UserClaims struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}
