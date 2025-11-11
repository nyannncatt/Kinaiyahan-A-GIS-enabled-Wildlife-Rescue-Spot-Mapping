# Supabase Reset Password Setup Guide

This guide explains what you need to configure in Supabase for the reset password functionality to work properly.

## Prerequisites

The reset password feature has been added to your profile section. When users click "Reset Password", it will send them an email with a link to reset their password.

## Supabase Configuration Steps

### 1. Configure Email Templates (Optional but Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Find the **Reset Password** template
4. Customize the email template if needed (optional)
   - The default template should work fine
   - You can customize the subject and body to match your brand

### 2. Configure Redirect URLs

1. In your Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, make sure you have added:
   - `http://localhost:5173/reset-password` (for local development)
   - `https://your-production-domain.com/reset-password` (for production)
   - Any other domains where your app is hosted

   **Important:** Supabase will only redirect to URLs that are in this allowlist for security reasons.

### 3. Verify Email Settings

1. Go to **Authentication** → **Providers**
2. Make sure **Email** provider is enabled
3. Check that your email service is configured:
   - Supabase provides a default email service (limited)
   - For production, consider setting up a custom SMTP provider (SendGrid, AWS SES, etc.)

### 4. Test the Feature

1. Go to `http://localhost:5173/admin`
2. Scroll to the "My Profile" section
3. Click the **Reset Password** button (next to the Edit button)
4. Click **Send Reset Link** in the modal
5. Check your email inbox for the reset password link
6. Click the link in the email
7. You should be redirected to `/reset-password` page where you can set a new password

## How It Works

1. User clicks "Reset Password" button in their profile
2. A modal opens showing their email address
3. User confirms by clicking "Send Reset Link"
4. Supabase sends an email with a reset link
5. User clicks the link in their email
6. They are redirected to `/reset-password` page
7. User enters a new password
8. Password is updated and user is logged out
9. User can log in again with the new password

## Troubleshooting

### Email Not Received
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email service status
- Verify redirect URL is in the allowlist

### Redirect URL Error
- Make sure `http://localhost:5173/reset-password` is added to Redirect URLs in Supabase
- For production, add your production domain

### Reset Link Expired
- Reset links typically expire after 1 hour (default Supabase setting)
- User needs to request a new reset link

## Additional Notes

- The reset password functionality uses Supabase's built-in `resetPasswordForEmail` method
- The redirect URL is dynamically set based on `window.location.origin`
- The `/reset-password` route should already exist in your app (based on `src/pages/ResetPassword.tsx`)

## Security Considerations

- Reset links are single-use and time-limited
- Users must be authenticated to see the reset password button
- The email address is automatically pulled from the user's profile
- Supabase handles all the security aspects of password reset tokens

