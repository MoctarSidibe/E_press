# Network Error Troubleshooting Guide

## Issue: "Network Error" during login

### Quick Checks

1. **Is the backend server running?**
   ```bash
   cd backend
   npm start
   ```
   You should see: "🚀 Server running on port 5000"

2. **Check your IP configuration**
   - Current API URL: `http://192.168.1.65:5000/api`
   - Verify this is your computer's local IP

3. **Find your correct IP address:**
   ```bash
   # Windows
   ipconfig
   # Look for "IPv4 Address" under your active network adapter
   
   # Example output:
   # IPv4 Address: 192.168.1.XX
   ```

4. **Update mobile app if IP is different**
   Edit: `mobile/src/services/api.js`
   ```javascript
   const API_URL = __DEV__
       ? 'http://YOUR_IP_HERE:5000/api'  // <-- Update this
       : 'https://your-production-url.com/api';
   ```

5. **Firewall check**
   - Windows Firewall might be blocking port 5000
   - Allow Node.js through firewall if prompted

### Step-by-Step Fix

**Step 1: Get your IP address**
```powershell
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress
```

**Step 2: Start backend server**
```bash
cd backend
npm start
```

**Step 3: Test backend is accessible**
Open browser and go to:
```
http://YOUR_IP:5000/health
```
You should see: `{"status":"ok",...}`

**Step 4: Update mobile API if needed**
If your IP is different than `192.168.1.65`, update:
- `mobile/src/services/api.js` (line 7)
- `mobile/src/services/socket.js` (line 17)

**Step 5: Restart Expo**
```bash
cd mobile
# Press 'r' in Expo terminal to reload
```

### Common Issues

**Issue: Backend not starting**
- Check if port 5000 is already in use
- Try killing the process and restarting

**Issue: Can't connect from phone**
- Phone and computer must be on same WiFi network
- Company/school WiFi might block connections
- Try USB connection instead (adb reverse)

**Issue: "Network request failed"**
- Backend server stopped
- Wrong IP address
- Firewall blocking connection

### USB Connection Alternative (Android)

If WiFi doesn't work:
```bash
# Connect phone via USB, enable USB debugging
adb reverse tcp:5000 tcp:5000

# Then use in api.js:
const API_URL = 'http://localhost:5000/api'
```

### Test Endpoints

Once backend is running, test these in browser:
- `http://YOUR_IP:5000/health` - Should return OK
- `http://YOUR_IP:5000/api/categories` - Should return categories (might need auth)

### Still Not Working?

1. Check backend logs for errors
2. Check mobile console for exact error message
3. Verify database connection is working
4. Try restarting both backend and mobile app
