# Mobile API Registration/Login Fixes

## Issues Fixed

### 1. **Error Format Mismatch**
   - **Problem**: Backend returned validation errors as `{ errors: [...] }` but mobile app expected `{ error: "..." }`
   - **Fix**: Updated backend to return both formats for compatibility:
     ```javascript
     { error: "Error message", errors: [...] }
     ```

### 2. **Poor Error Handling**
   - **Problem**: Mobile app didn't show detailed error messages
   - **Fix**: 
     - Enhanced `AuthContext.js` to handle multiple error formats
     - Added comprehensive error logging
     - Improved error messages for network issues

### 3. **Android Network Security**
   - **Problem**: Android 9+ blocks HTTP (cleartext) traffic by default
   - **Fix**: Added `usesCleartextTraffic: true` to `app.json` Android config

### 4. **API Logging**
   - **Problem**: Limited visibility into API requests/responses
   - **Fix**: 
     - Added detailed request/response logging in `api.js`
     - Added registration/login logging in backend `auth.service.js`

## Files Modified

### Backend
- `backend/routes/auth.routes.js` - Improved error format and logging
- `backend/services/auth.service.js` - Added registration logging

### Mobile
- `mobile/src/context/AuthContext.js` - Enhanced error handling
- `mobile/src/services/api.js` - Improved logging and error handling
- `mobile/app.json` - Added `usesCleartextTraffic: true` for Android

## Testing Checklist

### ✅ Registration
- [ ] Register new customer account
- [ ] Register new driver account
- [ ] Try registering with existing email (should show error)
- [ ] Try registering with invalid email (should show validation error)
- [ ] Try registering with short password (should show validation error)
- [ ] Try registering with missing fields (should show validation error)

### ✅ Login
- [ ] Login with valid credentials
- [ ] Login with invalid email (should show error)
- [ ] Login with wrong password (should show error)
- [ ] Login with deactivated account (should show error)

### ✅ API Connectivity
- [ ] Verify API URL is correct: `http://161.97.66.69/api`
- [ ] Check network requests in console/logs
- [ ] Verify CORS allows mobile app requests
- [ ] Test with no internet connection (should show network error)

### ✅ Other Endpoints
- [ ] `/api/auth/me` - Get current user (requires auth)
- [ ] `/api/categories` - Get categories (public)
- [ ] `/api/orders` - Order endpoints (requires auth)
- [ ] `/api/users/profile` - User profile (requires auth)

## Next Steps

1. **Rebuild APK** with the fixes:
   ```bash
   cd mobile
   eas build -p android --profile production
   ```

2. **Test on Device**:
   - Install the new APK
   - Try registration and login
   - Check console logs for detailed error messages
   - Verify all API endpoints work

3. **Monitor Backend Logs**:
   ```bash
   pm2 logs epress-api
   ```
   - Watch for registration/login attempts
   - Check for any database errors
   - Verify CORS is working

## Debugging Tips

### Mobile App Logs
- Check React Native debugger console
- Look for `[API]` and `[AuthContext]` log messages
- Network errors will show `NETWORK_ERROR` code

### Backend Logs
- Registration attempts: `[REGISTER] Attempting to register user: ...`
- Login attempts: `[LOGIN DEBUG] Request for: ...`
- Errors: `[REGISTER ERROR]` or `[LOGIN ERROR]`

### Common Issues

1. **"Network error"**
   - Check internet connection
   - Verify API URL is correct
   - Check if backend is running: `pm2 status`
   - Verify Nginx is routing correctly

2. **"Registration failed" with no details**
   - Check backend logs for actual error
   - Verify database connection
   - Check user permissions in PostgreSQL

3. **CORS errors**
   - Mobile apps don't send Origin header (should be fine)
   - Check `ALLOWED_ORIGINS` in backend `.env`
   - Verify CORS middleware is configured correctly

4. **"Email already registered"**
   - User exists in database
   - Try different email or login instead

## Database Verification

To check if registration is working in database:
```sql
sudo -u postgres psql -d epress_laundry
SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;
\q
```
