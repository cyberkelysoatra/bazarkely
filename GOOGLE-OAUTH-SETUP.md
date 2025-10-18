# Google OAuth Setup for BazarKELY

## 🔧 Supabase Configuration Required

### 1. Enable Google Provider in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard
   - Select your BazarKELY project

2. **Authentication Settings**
   - Go to Authentication → Providers
   - Find "Google" in the list
   - Toggle "Enable Google provider" to ON

### 2. Google Cloud Console Setup

1. **Create Google Cloud Project** (if not exists)
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing one
   - Note the Project ID

2. **Enable Google+ API**
   - Go to APIs & Services → Library
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "BazarKELY Authentication"

4. **Configure Authorized Redirect URIs**
   ```
   https://ofzmwrzatcztoekrpvkj.supabase.co/auth/v1/callback
   ```
   - Add this exact URL to "Authorized redirect URIs"
   - Click "Create"

5. **Get Client Credentials**
   - Copy the "Client ID"
   - Copy the "Client Secret"

### 3. Configure Supabase Google Provider

1. **In Supabase Dashboard**
   - Go to Authentication → Providers → Google
   - Paste the Client ID from Google Cloud Console
   - Paste the Client Secret from Google Cloud Console
   - Click "Save"

2. **Configure Site URL**
   - Go to Authentication → URL Configuration
   - Site URL: `https://your-netlify-domain.netlify.app`
   - Redirect URLs: Add your production domain

### 4. Update Trigger for Google Users

The existing `handle_new_user` trigger should work with Google OAuth users. The trigger will receive:
- `id`: Google user ID from Supabase Auth
- `email`: Google email address
- `raw_user_meta_data`: Contains Google profile data

**Trigger should handle:**
```sql
-- Extract username from Google metadata
username = COALESCE(
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'name',
  split_part(email, '@', 1)
)

-- Extract phone if available
phone = raw_user_meta_data->>'phone_number'
```

### 5. Environment Variables (if needed)

Add to your Netlify environment variables:
```
SUPABASE_URL=https://ofzmwrzatcztoekrpvkj.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

## 🧪 Testing Google OAuth

### 1. Local Testing
```bash
# Start development server
npm run dev

# Test Google sign-in
# 1. Click "Continuer avec Google"
# 2. Complete Google authentication
# 3. Should redirect to /dashboard
# 4. Check console for success messages
```

### 2. Production Testing
1. Deploy to Netlify
2. Test Google sign-in flow
3. Verify user profile creation in Supabase
4. Check that dashboard loads correctly

### 3. Debugging

**Check Supabase Logs:**
- Go to Supabase Dashboard → Logs
- Filter by "Authentication"
- Look for Google OAuth events

**Check Browser Console:**
- Look for OAuth callback messages
- Verify session establishment
- Check for any error messages

## 🔍 Expected User Flow

1. **User clicks "Continuer avec Google"**
2. **Redirected to Google OAuth**
3. **User authorizes BazarKELY**
4. **Google redirects to Supabase callback**
5. **Supabase processes OAuth and creates session**
6. **BazarKELY receives callback and processes session**
7. **User profile created via trigger**
8. **User redirected to dashboard**

## 🚨 Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check Google Cloud Console redirect URIs
   - Ensure exact match with Supabase callback URL

2. **"Client ID not found"**
   - Verify Google Client ID in Supabase
   - Check for typos in configuration

3. **"User profile not created"**
   - Check trigger logs in Supabase
   - Verify trigger is enabled
   - Check RLS policies

4. **"Session not established"**
   - Check browser console for errors
   - Verify Supabase configuration
   - Check network requests

### Debug Commands

```bash
# Check Supabase connection
curl https://ofzmwrzatcztoekrpvkj.supabase.co/rest/v1/

# Test OAuth flow
# Open browser dev tools
# Navigate to auth page
# Click Google sign-in
# Monitor network tab for OAuth requests
```

## 📋 Verification Checklist

- [ ] Google provider enabled in Supabase
- [ ] Google Cloud Console project created
- [ ] OAuth 2.0 credentials configured
- [ ] Redirect URI added to Google Console
- [ ] Client ID and Secret added to Supabase
- [ ] Site URL configured in Supabase
- [ ] Trigger handles Google user metadata
- [ ] Local testing successful
- [ ] Production testing successful
- [ ] User profile creation verified
- [ ] Dashboard access confirmed

## 🔄 Rollback Plan

If Google OAuth causes issues:

1. **Disable Google provider in Supabase**
2. **Revert to email/password only**
3. **Update AuthPage.tsx to hide Google button**
4. **Test existing authentication flow**

## 📞 Support

- Supabase Documentation: https://supabase.com/docs/guides/auth/social-login/auth-google
- Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
- BazarKELY Issues: Check project repository

---

**Ready for Google OAuth!** 🚀 Your BazarKELY application now supports Google authentication alongside email/password authentication.





















