# Email Setup Instructions

## Gmail App Password Setup

To enable email functionality for password reset, you need to generate a Gmail App Password:

### Step 1: Enable 2-Factor Authentication (if not already enabled)
1. Go to https://myaccount.google.com/security
2. Under "Signing in to Google", enable "2-Step Verification"
3. Follow the setup process

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. You may need to sign in again
3. In the "Select app" dropdown, choose "Mail"
4. In the "Select device" dropdown, choose "Other (Custom name)"
5. Enter "FYP Management System" or any name
6. Click "Generate"
7. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

### Step 3: Set server environment variables
Put the mailbox and app password in the host environment, not in source code. Locally, copy `.env.example` to `.env.local`. On Vercel or Railway, set the same variables in the project settings.

1. Set `EMAIL_USER` to the Gmail address that owns the app password
2. Set `EMAIL_PASSWORD` to the 16-character app password
3. Remove any spaces from the password
4. Save the file or the host settings

Example (placeholders only):
```
EMAIL_USER=your-mailbox@example.com
EMAIL_PASSWORD=your-smtp-or-app-password
```

Google displays the app password in groups of four. Remove the spaces before saving it.

### Step 4: Restart the Server
After updating the environment:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Testing Password Reset

1. Go to the login page
2. Click "Forgot Password?"
3. Enter a valid email address from the database
4. Check the inbox of that email
5. Click the reset link in the email

## Troubleshooting

### Emails Not Sending?
- ✅ Verify App Password is correct (no spaces)
- ✅ Check that 2FA is enabled on Gmail account
- ✅ Confirm EMAIL_USER matches the Gmail account
- ✅ Server must be restarted after environment variable changes
- ✅ Check server console for error messages

### "Less Secure App Access" Error?
- Use App Password instead (see steps above)
- This error means you're using your regular password

### Email Goes to Spam?
- This is normal for development
- Check spam/junk folder
- Mark as "Not Spam" to improve delivery

## Changing Admin Email in Future

To change the admin email:

1. **Update System Settings:**
   - Login as Super Admin
   - Go to Settings
   - Update "Contact Email" in General Settings
   - Click Save

2. **Update the host environment:**
   - Change `EMAIL_USER` to the new mailbox
   - Generate a new app password for that mailbox
   - Update `EMAIL_PASSWORD` in `.env.local`, Vercel, or Railway
   - Restart the server

3. **Where mail settings live:**
   - `data/system-settings.json` — contact email shown in message footers
   - Server environment — `EMAIL_USER` and `EMAIL_PASSWORD` (SMTP credentials)
   - The SMTP login is always the environment variables. It does not fall back to a password or mailbox stored in code.

## Security Notes

- Credentials belong only in server environment variables (`EMAIL_USER`, `EMAIL_PASSWORD`). Never put them in source code, committed `.env` files, or `NEXT_PUBLIC_` variables.
- `NEXT_PUBLIC_` values are sent to the browser. Use that prefix only for public configuration such as `NEXT_PUBLIC_APP_URL`.
- Never commit `.env` or `.env.local`. `.env.example` contains placeholders only.
- Keep the app password secure and do not share it.
- Each device or app should have its own app password.
- You can revoke app passwords anytime from Google Account settings.
- If a password was ever committed, revoke it and set a new one in the host. Removing it from the latest commit does not erase git history.
