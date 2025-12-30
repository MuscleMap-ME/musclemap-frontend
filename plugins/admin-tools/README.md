# Admin Tools Plugin

Administrative endpoints for managing the MuscleMap platform.

## Endpoints

All endpoints require admin role.

### GET /api/plugins/admin-tools/stats
Returns platform statistics.

### GET /api/plugins/admin-tools/users
List all users with pagination.

### POST /api/plugins/admin-tools/users/:userId/grant-credits
Grant credits to a user.

### GET /api/plugins/admin-tools/plugins
List all installed plugins.
