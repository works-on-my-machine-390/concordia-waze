# PR: Firebase Firestore Integration for User Data Persistence

## Overview
This PR adds complete Firebase Firestore integration to persist authenticated user data (search history, schedule, and saved addresses). The implementation includes backend Go services, updated authentication endpoints, frontend React Native hooks with TypeScript types, comprehensive unit tests, and support for guest users via AsyncStorage.

---

## Files Created

### Backend
- **`backend/internal/application/firebase_service.go`** - Firestore CRUD operations for all user data (271 lines)
- **`backend/internal/application/firebase_service_test.go`** - 14 integration tests covering all CRUD operations (NEW)

### Frontend  
- **`frontend/hooks/firebase/useFirestore.ts`** - TypeScript Firestore Web SDK helpers with type-safe CRUD operations (163 lines)
- **`frontend/hooks/guestStorage.ts`** - AsyncStorage helpers for guest users with parallel interface to Firestore functions (NEW)
- **`frontend/__tests__/useFirestore.test.ts`** - 20+ Jest unit tests for Firestore operations (NEW)
- **`frontend/__tests__/guestStorage.test.ts`** - Jest unit tests for guest AsyncStorage persistence (NEW)

### Files Modified
- **`backend/internal/presentation/handler/auth_handler.go`** - Modified signup/login/profile endpoints to integrate with Firestore
- **`backend/internal/application/user_service.go`** - Added `GenerateTokenForUser()` method for manual JWT generation

---

## Database Schema

### Firestore Structure
```
firestore/
├── users/{userId}
│   ├── Document fields:
│   │   ├── userId (string)
│   │   ├── Email (string, indexed for login queries)
│   │   ├── FirstName (string)
│   │   ├── LastName (string)
│   │   └── Password (string) ⚠️ TODO: Implement bcrypt hashing
│   │
│   ├── searchHistory/ (subcollection)
│   │   ├── _init (placeholder doc, auto-created)
│   │   └── {autoId}
│   │       ├── query (string)
│   │       ├── locations (string)
│   │       └── timestamp (Timestamp, server-side)
│   │
│   ├── schedule/ (subcollection)
│   │   ├── _init (placeholder doc, auto-created)
│   │   └── {autoId}
│   │       ├── name (string)
│   │       ├── building (string, optional)
│   │       ├── room (string, optional)
│   │       ├── startTime (string, e.g., "17:45")
│   │       ├── endTime (string, e.g., "20:15")
│   │       ├── daysOfWeek (array of strings)
│   │       └── type (string: "class", "work", "other")
│   │
│   └── savedAddresses/ (subcollection)
│       ├── _init (placeholder doc, auto-created)
│       └── {autoId}
│           └── address (string)
```

### Go Structs (Backend)
**File: `backend/internal/application/firebase_service.go` (lines 32-56)**

```go
type User struct {
	UserID    string `firestore:"userId" json:"userId"`
	Email     string `firestore:"Email" json:"email"`
	FirstName string `firestore:"FirstName" json:"firstName"`
	LastName  string `firestore:"LastName" json:"lastName"`
	Password  string `firestore:"Password" json:"password"`
}

type SearchHistoryItem struct {
	SearchID  string    `firestore:"searchId" json:"searchId,omitempty"`
	Query     string    `firestore:"query" json:"query"`
	Locations string    `firestore:"locations" json:"locations"`
	Timestamp time.Time `firestore:"timestamp" json:"timestamp,omitempty"`
}

type ScheduleItem struct {
	ScheduleID string   `firestore:"scheduleId" json:"scheduleId,omitempty"`
	Name       string   `firestore:"name" json:"name"`
	Building   string   `firestore:"building,omitempty" json:"building,omitempty"`
	Room       string   `firestore:"room,omitempty" json:"room,omitempty"`
	StartTime  string   `firestore:"startTime" json:"startTime"`
	EndTime    string   `firestore:"endTime" json:"endTime"`
	DaysOfWeek []string `firestore:"daysOfWeek" json:"daysOfWeek"`
	Type       string   `firestore:"type" json:"type"`
}

type SavedAddress struct {
	AddressID string `firestore:"addressId" json:"addressId,omitempty"`
	Address   string `firestore:"address" json:"address"`
}
```

### TypeScript Interfaces (Frontend)
**File: `frontend/hooks/firebase/useFirestore.ts` (lines 18-44)**

```typescript
export interface UserProfile {
  userId: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface SearchHistoryItem {
  searchId?: string;
  locations: string;
  query: string;
  timestamp: Date;
}

export interface ScheduleItem {
  scheduleId?: string;
  name: string;
  building?: string;
  room?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  type: string;
}

export interface SavedAddress {
  addressId?: string;
  address: string;
}
```

---

## API Endpoints

### Modified Endpoints
All endpoints now integrate with Firestore for persistence:

#### `POST /auth/signup`
- **Request:** `{ name, email, password }`
- **Response:** `{ id, name, email, token }`
- **Action:** 
  1. Creates JWT token via UserService
  2. Writes User profile to Firestore with password
  3. Initializes subcollections (searchHistory, schedule, savedAddresses) with placeholder docs
- **File:** `backend/internal/presentation/handler/auth_handler.go:SignUp()` (lines 66-100)

#### `POST /auth/login`
- **Request:** `{ email, password }`
- **Response:** `{ id, name, email, token }`
- **Action:**
  1. Queries Firestore for user by email (`GetUserProfileByEmail()`)
  2. Verifies password (plaintext, TODO: use bcrypt)
  3. Generates JWT token via `UserService.GenerateTokenForUser()`
- **File:** `backend/internal/presentation/handler/auth_handler.go:Login()` (lines 105-145)

#### `GET /auth/profile`
- **Response:** `{ id, name, email }`
- **Action:** Reads User profile from Firestore (previously in-memory)
- **Authentication:** Requires valid JWT token
- **File:** `backend/internal/presentation/handler/auth_handler.go:GetProfile()` (lines 150-185)

#### `POST /auth/logout`
- **Action:** Revokes JWT token via JWTManager
- **File:** `backend/internal/presentation/handler/auth_handler.go:Logout()`

### New Backend Service Methods
**File: `backend/internal/application/firebase_service.go`**

| Method | Purpose | Parameters |
|--------|---------|-----------|
| `CreateUserProfile()` | Creates user doc + initializes subcollections | userID, profile |
| `GetUserProfile()` | Retrieves user profile by ID | userID |
| `GetUserProfileByEmail()` | Queries user by email (used in login) | email |
| `AddSearchHistory()` | Adds query to user's search history | userID, query, locations |
| `GetSearchHistory()` | Retrieves all search history for user | userID |
| `ClearSearchHistory()` | Deletes all search history docs | userID |
| `AddScheduleItem()` | Adds schedule entry | userID, item |
| `GetUserSchedule()` | Retrieves all schedule items | userID |
| `UpdateScheduleItem()` | Updates existing schedule item | userID, scheduleID, item |
| `DeleteScheduleItem()` | Deletes schedule item | userID, scheduleID |
| `AddSavedAddress()` | Adds favorite address to list | userID, address |
| `GetSavedAddresses()` | Retrieves all saved addresses | userID |
| `UpdateSavedAddress()` | Updates existing saved address | userID, addressID, address |
| `DeleteSavedAddress()` | Deletes saved address | userID, addressID |

### Frontend Hooks
**File: `frontend/hooks/firebase/useFirestore.ts`**

| Function | Purpose | Auth Required |
|----------|---------|---|
| `createUserProfile()` | Creates user profile in Firestore | No (called during signup) |
| `getUserProfile()` | Retrieves user profile | Yes |
| `addSearchHistory()` | Adds search query to history | Yes |
| `getSearchHistory()` | Retrieves search history (latest first) | Yes |
| `clearSearchHistory()` | Deletes all search history | Yes |
| `addScheduleItem()` | Adds schedule entry | Yes |
| `getUserSchedule()` | Retrieves schedule (sorted by startTime) | Yes |
| `updateScheduleItem()` | Updates schedule entry | Yes |
| `deleteScheduleItem()` | Deletes schedule entry | Yes |
| `addSavedAddress()` | Adds favorite address | Yes |
| `getSavedAddresses()` | Retrieves saved addresses | Yes |
| `updateSavedAddress()` | Updates saved address | Yes |
| `deleteSavedAddress()` | Deletes saved address | Yes |

### Guest Storage (Local AsyncStorage)
**File: `frontend/hooks/guestStorage.ts`**

Parallel interface to Firestore for unauthenticated users:
- `getGuestProfile()` / `setGuestProfile()`
- `addGuestSearchHistory()` / `getGuestSearchHistory()` / `clearGuestSearchHistory()`
- `addGuestScheduleItem()` / `getGuestSchedule()` / `setGuestSchedule()`
- `addGuestSavedAddress()` / `getGuestSavedAddresses()` / `setGuestSavedAddresses()`
- `clearGuestData()` - Atomic cleanup of all guest data

---

## Testing

### Backend Tests
**File: `backend/internal/application/firebase_service_test.go`**

14 integration test functions:
1. `TestCreateAndGetUserProfile` - User creation and retrieval
2. `TestGetUserProfileByEmail` - Email-based user lookup (login flow)
3. `TestAddAndGetSearchHistory` - Search history CRUD
4. `TestClearSearchHistory` - Search history deletion
5. `TestAddAndGetSchedule` - Schedule list operations
6. `TestUpdateScheduleItem` - Schedule item update
7. `TestDeleteScheduleItem` - Schedule item deletion
8. `TestAddAndGetSavedAddresses` - Saved addresses CRUD
9. `TestUpdateSavedAddress` - Address update
10. `TestDeleteSavedAddress` - Address deletion
11. `TestSubcollectionsInitialized` - Verifies _init placeholder docs created
12. Edge case tests for empty collections, non-existent users, error handling

**Setup:** Uses Firestore emulator (requires `FIRESTORE_EMULATOR_HOST` env var or `serviceAccountKey.json`)

**Run:**
```bash
cd backend
firebase emulators:start --only firestore &
go test -v ./internal/application
```

### Frontend Tests

#### Firestore Tests
**File: `frontend/__tests__/useFirestore.test.ts`**

20+ Jest unit tests with mocked Firebase Web SDK:
- Search history: add, get, clear, empty array handling
- Schedule: add, get, update, delete, sorting by startTime
- Saved addresses: add, get, update, delete
- User profile: create, get, null handling
- Error cases: Firestore errors, missing documents

Mocks:
- Firebase functions: `addDoc()`, `getDocs()`, `updateDoc()`, `deleteDoc()`, `getDoc()`, `setDoc()`
- Firestore query: `collection()`, `doc()`, `query()`, `where()`, `orderBy()`

#### Guest Storage Tests
**File: `frontend/__tests__/guestStorage.test.ts`**

Jest unit tests with mocked AsyncStorage:
- User profile: get/set with JSON persistence
- Search history: add, get, clear
- Schedule: add, get, batch update via `setGuestSchedule()`
- Saved addresses: add, get, batch update via `setGuestSavedAddresses()`
- Atomic operations: `clearGuestData()` removes all keys

Mocks:
- AsyncStorage methods: `getItem()`, `setItem()`, `removeItem()`, `multiRemove()`
- All tests use manual Jest mocks with `jest.fn()`

**Run:**
```bash
cd frontend
npm test -- --testPathPattern="useFirestore|guestStorage"
```

---

## Authentication Flow

### Signup Flow
```
Client "POST /auth/signup" 
  ├─ UserService.SignUp() → generate JWT + create in-memory user
  ├─ FirebaseService.CreateUserProfile() → write to Firestore
  ├─ initializeSubcollections() → create _init placeholder docs
  └─ Return: JWT token + user profile
```

### Login Flow
```
Client "POST /auth/login"
  ├─ FirebaseService.GetUserProfileByEmail() → query Firestore by Email
  ├─ Verify password (plaintext ⚠️)
  ├─ UserService.GenerateTokenForUser() → create JWT
  └─ Return: JWT token + user profile
```

### Profile Endpoint
```
Client "GET /auth/profile" (with JWT)
  ├─ Extract userID from JWT
  ├─ FirebaseService.GetUserProfile(userID) → read from Firestore
  └─ Return: user profile
```

---

## Known Issues & TODOs

1. **Password Storage** ⚠️
   - Currently stores plaintext passwords in Firestore
   - TODO: Implement bcrypt hashing before storing
   - Location: `backend/internal/presentation/handler/auth_handler.go:SignUp()` line 92

2. **Missing User ID Validation**
   - No middleware to verify user can only access their own data
   - TODO: Add middleware to validate JWT userID matches resource owner in Firestore queries

3. **Placeholder Documents**
   - Subcollections created with `_init` placeholder docs to enable pre-initialization
   - These could be removed with custom logic if not desired

4. **Frontend: Live Testing**
   - Frontend tests use mocks, not integration tests against live Firestore
   - TODO: Add integration tests using Firebase emulator for frontend

---

## Environment Setup

### Backend
```bash
# Install Firebase Admin SDK v4
go get firebase.google.com/go/v4

# Set up Firestore emulator
firebase emulators:start --only firestore

# Run with emulator
export FIRESTORE_EMULATOR_HOST=localhost:8080
go run main.go
```

### Frontend
```bash
# Firebase Web SDK v9+ (modular) already in package.json
npm install

# Run tests
npm test

# Configure Firebase in frontend/config/firebase.ts with Web SDK credentials
```

---

## Related Files Reference

- Backend router integration: `backend/internal/router/router.go` - registers AuthHandler
- Frontend Firebase config: `frontend/config/firebase.ts` - initializes Firebase Web SDK
- Swagger docs: `backend/docs/swagger.json` - API documentation with new endpoints

---

## Summary of Changes

✅ **Completed:**
- Firebase Admin SDK integration with Firestore
- Complete CRUD service layer for User, SearchHistory, Schedule, SavedAddress
- REST API endpoints with Swagger/OpenAPI documentation
- Frontend Firestore Web SDK helpers with TypeScript types
- Guest mode with AsyncStorage (parallel interface)
- Auth integration: signup creates profile, login queries Firestore, profile reads from Firestore
- Subcollection initialization with placeholder documents
- Backend integration tests (14 test functions)
- Frontend unit tests (40+ test cases across 2 files)
- Fixed: Time format for schedule changed from Date objects to strings ("HH:mm")

⚠️ **TODO for Production:**
- Implement bcrypt password hashing
- Add middleware for user ID validation
- Add rate limiting on auth endpoints
- Implement Firebase Security Rules for Firestore access control
- Add error logging and monitoring
- Database backup strategy

