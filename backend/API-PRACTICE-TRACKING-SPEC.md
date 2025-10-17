# 🔧 API SPECIFICATION - PRACTICE TRACKING SYSTEM
## BazarKELY Backend API Documentation

**Version:** 1.0  
**Created:** 2025-10-17  
**Last Updated:** 2025-10-17  
**Status:** Ready for Implementation  

---

## 📋 OVERVIEW

This document specifies the backend API endpoints for the BazarKELY practice tracking system. The API enables synchronization of practice behavior data between the frontend Zustand store and the MySQL database, tracking three priority user behaviors: daily login streaks, transaction recording, and budget usage.

### **System Architecture**
- **Frontend**: React with Zustand store and localStorage persistence
- **Backend**: PHP with MySQL database
- **Hosting**: OVH with existing BazarKELY infrastructure
- **Authentication**: JWT token-based authentication
- **Data Sync**: Frontend calls API to sync practice tracking data

---

## 🎯 ENDPOINTS

### **1. Track Daily Login**
**Endpoint:** `POST /api/practice/track-login`  
**Purpose:** Record daily login and update streak count  
**Authentication:** Required (JWT token)

#### **Request Parameters**
```json
{
  "userId": "string (required)",
  "timestamp": "string (ISO 8601, optional - defaults to server time)"
}
```

#### **Request Example**
```http
POST /api/practice/track-login
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "userId": "user_123456789",
  "timestamp": "2025-10-17T10:30:00.000Z"
}
```

#### **Response Format**
```json
{
  "success": true,
  "data": {
    "userId": "user_123456789",
    "dailyLoginStreak": 5,
    "lastLoginDate": "2025-10-17T10:30:00.000Z",
    "practiceScore": 18,
    "lastScoreCalculation": "2025-10-17T10:30:00.000Z"
  },
  "message": "Login streak updated successfully"
}
```

---

### **2. Track Transaction Recording**
**Endpoint:** `POST /api/practice/track-transaction`  
**Purpose:** Record transaction entry and update count  
**Authentication:** Required (JWT token)

#### **Request Parameters**
```json
{
  "userId": "string (required)",
  "transactionId": "string (required)",
  "timestamp": "string (ISO 8601, optional - defaults to server time)"
}
```

#### **Request Example**
```http
POST /api/practice/track-transaction
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "userId": "user_123456789",
  "transactionId": "txn_987654321",
  "timestamp": "2025-10-17T14:45:00.000Z"
}
```

#### **Response Format**
```json
{
  "success": true,
  "data": {
    "userId": "user_123456789",
    "transactionsRecordedCount": 42,
    "lastTransactionDate": "2025-10-17T14:45:00.000Z",
    "practiceScore": 18,
    "lastScoreCalculation": "2025-10-17T14:45:00.000Z"
  },
  "message": "Transaction tracking updated successfully"
}
```

---

### **3. Track Budget Usage**
**Endpoint:** `POST /api/practice/track-budget`  
**Purpose:** Record budget update/usage and update count  
**Authentication:** Required (JWT token)

#### **Request Parameters**
```json
{
  "userId": "string (required)",
  "budgetId": "string (required)",
  "timestamp": "string (ISO 8601, optional - defaults to server time)"
}
```

#### **Request Example**
```http
POST /api/practice/track-budget
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "userId": "user_123456789",
  "budgetId": "budget_456789123",
  "timestamp": "2025-10-17T16:20:00.000Z"
}
```

#### **Response Format**
```json
{
  "success": true,
  "data": {
    "userId": "user_123456789",
    "budgetUsageCount": 15,
    "lastBudgetUpdateDate": "2025-10-17T16:20:00.000Z",
    "practiceScore": 18,
    "lastScoreCalculation": "2025-10-17T16:20:00.000Z"
  },
  "message": "Budget usage tracking updated successfully"
}
```

---

### **4. Get User Practice Data**
**Endpoint:** `GET /api/practice/user/:userId`  
**Purpose:** Retrieve complete practice tracking data for a user  
**Authentication:** Required (JWT token)

#### **URL Parameters**
- `userId` (string, required): User identifier

#### **Request Example**
```http
GET /api/practice/user/user_123456789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Response Format**
```json
{
  "success": true,
  "data": {
    "userId": "user_123456789",
    "behaviors": {
      "dailyLoginStreak": 5,
      "lastLoginDate": "2025-10-17T10:30:00.000Z",
      "transactionsRecordedCount": 42,
      "lastTransactionDate": "2025-10-17T14:45:00.000Z",
      "budgetUsageCount": 15,
      "lastBudgetUpdateDate": "2025-10-17T16:20:00.000Z"
    },
    "practiceScore": 18,
    "lastScoreCalculation": "2025-10-17T16:20:00.000Z",
    "multiplier": 1.0,
    "createdAt": "2025-10-10T08:00:00.000Z",
    "updatedAt": "2025-10-17T16:20:00.000Z"
  },
  "message": "Practice tracking data retrieved successfully"
}
```

---

## 🗄️ DATABASE SCHEMA

### **Practice Tracking Table**

#### **Table Name:** `practice_tracking`

#### **MySQL CREATE TABLE Statement**
```sql
CREATE TABLE `practice_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `daily_login_streak` int(11) DEFAULT 0,
  `last_login_date` datetime DEFAULT NULL,
  `transactions_recorded_count` int(11) DEFAULT 0,
  `last_transaction_date` datetime DEFAULT NULL,
  `budget_usage_count` int(11) DEFAULT 0,
  `last_budget_update_date` datetime DEFAULT NULL,
  `practice_score` int(11) DEFAULT 0,
  `last_score_calculation` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_id` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_practice_score` (`practice_score`),
  KEY `idx_last_login_date` (`last_login_date`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **Column Descriptions**

| Column | Type | Description |
|--------|------|-------------|
| `id` | int(11) | Primary key, auto-increment |
| `user_id` | varchar(255) | Foreign key to users table, unique |
| `daily_login_streak` | int(11) | Current daily login streak count |
| `last_login_date` | datetime | Last login date in UTC |
| `transactions_recorded_count` | int(11) | Total transactions recorded |
| `last_transaction_date` | datetime | Last transaction date in UTC |
| `budget_usage_count` | int(11) | Total budget updates/usage |
| `last_budget_update_date` | datetime | Last budget update date in UTC |
| `practice_score` | int(11) | Calculated practice score (0-18) |
| `last_score_calculation` | datetime | Last score calculation in UTC |
| `created_at` | timestamp | Record creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

#### **Indexes**
- **Primary Key**: `id`
- **Unique Index**: `user_id` (ensures one record per user)
- **Performance Indexes**: 
  - `idx_user_id` (for user lookups)
  - `idx_practice_score` (for score-based queries)
  - `idx_last_login_date` (for streak calculations)
  - `idx_updated_at` (for recent activity queries)

---

## 🔐 AUTHENTICATION

### **JWT Token Requirements**
All API endpoints require a valid JWT token in the Authorization header.

#### **Header Format**
```http
Authorization: Bearer <jwt_token>
```

#### **Token Validation**
- Token must be valid and not expired
- Token must contain valid user information
- User must exist in the system
- Token signature must be verified

#### **Authentication Flow**
1. Frontend sends request with JWT token
2. Backend validates token signature and expiration
3. Backend extracts user ID from token payload
4. Backend verifies user exists in database
5. Request proceeds if authentication successful

---

## ⚠️ ERROR HANDLING

### **HTTP Status Codes**

| Status Code | Description | When Used |
|-------------|-------------|-----------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Invalid request parameters or data |
| `401` | Unauthorized | Invalid or missing JWT token |
| `404` | Not Found | User not found or resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |

### **Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  },
  "timestamp": "2025-10-17T16:20:00.000Z"
}
```

### **Common Error Scenarios**

#### **400 Bad Request**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Missing required parameter: userId",
    "details": "The userId parameter is required for this endpoint"
  },
  "timestamp": "2025-10-17T16:20:00.000Z"
}
```

#### **401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired JWT token",
    "details": "Please authenticate and try again"
  },
  "timestamp": "2025-10-17T16:20:00.000Z"
}
```

#### **404 Not Found**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "details": "No practice tracking data found for user: user_123456789"
  },
  "timestamp": "2025-10-17T16:20:00.000Z"
}
```

#### **500 Internal Server Error**
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Internal server error",
    "details": "Unable to process request at this time"
  },
  "timestamp": "2025-10-17T16:20:00.000Z"
}
```

---

## 🚦 RATE LIMITING

### **Rate Limit Configuration**
- **Maximum Requests**: 100 requests per hour per user
- **Window**: 1 hour (3600 seconds)
- **Identification**: Based on user ID from JWT token
- **Storage**: Redis or database-based counter

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642512000
```

### **Rate Limit Exceeded Response**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": "Maximum 100 requests per hour allowed. Try again later."
  },
  "timestamp": "2025-10-17T16:20:00.000Z"
}
```

---

## 📊 RESPONSE FORMAT

### **Standard Response Structure**
All API responses follow a consistent JSON structure:

```json
{
  "success": boolean,
  "data": object | null,
  "message": string,
  "timestamp": string (ISO 8601)
}
```

### **Success Response Fields**
- `success`: Always `true` for successful requests
- `data`: Contains the requested data or operation result
- `message`: Human-readable success message
- `timestamp`: Response timestamp in ISO 8601 format

### **Error Response Fields**
- `success`: Always `false` for failed requests
- `error`: Error object with code, message, and details
- `timestamp`: Response timestamp in ISO 8601 format

---

## 🔧 IMPLEMENTATION NOTES

### **Backend Developer Guidelines**

#### **1. Database Setup**
```sql
-- Create the practice_tracking table
-- (Use the CREATE TABLE statement provided above)

-- Verify table creation
DESCRIBE practice_tracking;

-- Test with sample data
INSERT INTO practice_tracking (user_id, daily_login_streak, practice_score) 
VALUES ('test_user_123', 1, 6);
```

#### **2. PHP Implementation Structure**
```php
<?php
// Example endpoint structure
class PracticeTrackingController {
    
    public function trackLogin($request) {
        // 1. Validate JWT token
        // 2. Extract user ID from token
        // 3. Validate request parameters
        // 4. Update or create practice tracking record
        // 5. Calculate new practice score
        // 6. Return updated data
    }
    
    public function trackTransaction($request) {
        // Similar structure for transaction tracking
    }
    
    public function trackBudget($request) {
        // Similar structure for budget tracking
    }
    
    public function getUserData($userId) {
        // Retrieve complete practice tracking data
    }
    
    private function calculatePracticeScore($behaviors) {
        // Calculate score based on three behaviors
        // Maximum 18 points (3 behaviors × 6 points each)
    }
}
?>
```

#### **3. Practice Score Calculation Logic**
```php
private function calculatePracticeScore($behaviors) {
    $score = 0;
    
    // Daily login streak > 0 adds 6 points
    if ($behaviors['daily_login_streak'] > 0) {
        $score += 6;
    }
    
    // Transactions recorded > 0 adds 6 points
    if ($behaviors['transactions_recorded_count'] > 0) {
        $score += 6;
    }
    
    // Budget usage > 0 adds 6 points
    if ($behaviors['budget_usage_count'] > 0) {
        $score += 6;
    }
    
    // Maximum 18 points total
    return min(18, $score);
}
```

#### **4. Streak Calculation Logic**
```php
private function calculateLoginStreak($userId, $currentDate) {
    // 1. Get last login date from database
    // 2. Check if last login was yesterday (consecutive)
    // 3. If consecutive: increment streak
    // 4. If not consecutive: reset to 1
    // 5. If same day: keep current streak
    // 6. Update database with new streak and date
}
```

#### **5. Database Connection**
```php
// Use existing BazarKELY database connection
// Ensure UTC timezone for all datetime operations
date_default_timezone_set('UTC');
```

### **Frontend Integration Notes**

#### **1. API Base URL**
```javascript
const API_BASE_URL = 'https://api.bazarkely.com/api/practice';
```

#### **2. Authentication Header**
```javascript
const headers = {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
};
```

#### **3. Error Handling**
```javascript
try {
  const response = await fetch(`${API_BASE_URL}/track-login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, timestamp })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

---

## 🧪 TESTING

### **Test Cases**

#### **1. Authentication Tests**
- [ ] Valid JWT token accepted
- [ ] Invalid JWT token rejected (401)
- [ ] Missing JWT token rejected (401)
- [ ] Expired JWT token rejected (401)

#### **2. Parameter Validation Tests**
- [ ] Missing userId returns 400
- [ ] Invalid userId format returns 400
- [ ] Invalid timestamp format returns 400
- [ ] Valid parameters processed correctly

#### **3. Business Logic Tests**
- [ ] Login streak increments correctly
- [ ] Login streak resets after gap
- [ ] Transaction count increments correctly
- [ ] Budget usage count increments correctly
- [ ] Practice score calculates correctly (0-18)

#### **4. Database Tests**
- [ ] New user record created correctly
- [ ] Existing user record updated correctly
- [ ] Data persists across requests
- [ ] UTC timezone handling correct

#### **5. Rate Limiting Tests**
- [ ] 100 requests per hour limit enforced
- [ ] Rate limit headers included
- [ ] Rate limit reset works correctly

---

## 📚 ADDITIONAL RESOURCES

### **Related Documentation**
- BazarKELY Frontend TypeScript Interfaces: `frontend/src/types/certification.ts`
- BazarKELY Zustand Store: `frontend/src/store/certificationStore.ts`
- JWT Authentication Guide: `backend/AUTHENTICATION.md`
- Database Schema: `backend/DATABASE_SCHEMA.md`

### **API Versioning**
- Current Version: 1.0
- Version Header: `API-Version: 1.0`
- Backward Compatibility: Maintained for 6 months

### **Monitoring and Logging**
- Log all API requests and responses
- Monitor rate limiting usage
- Track practice score calculations
- Alert on database errors

---

## 📞 SUPPORT

### **Implementation Support**
- **Backend Developer**: Contact for PHP implementation questions
- **Frontend Developer**: Contact for integration questions
- **Database Administrator**: Contact for schema and performance questions

### **Documentation Updates**
This document should be updated when:
- New endpoints are added
- Response formats change
- Database schema is modified
- Authentication requirements change

---

*Document created: 2025-10-17*  
*BazarKELY Practice Tracking API Specification v1.0*
