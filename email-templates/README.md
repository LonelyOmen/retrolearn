# Custom Email Template Setup

This directory contains custom HTML email templates for Supabase authentication emails.

## How to Use the Verification Email Template

### Step 1: Access Supabase Dashboard
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/khwpljqvkuzftvxdervq
2. Navigate to **Authentication** → **Email Templates**

### Step 2: Update the Confirm Signup Template
1. Click on **Confirm signup** in the email templates list
2. Replace the existing HTML with the contents of `verification-email.html`
3. The template uses Supabase's default variable: `{{ .ConfirmationURL }}`
4. Click **Save** to apply the changes

### Step 3: Customize the Subject Line (Optional)
In the same section, you can also update the email subject line to something more friendly:
```
🎓 Welcome to Retro Learn - Verify Your Email
```

### Step 4: Test the Email
1. Create a test account to see how the email looks
2. Check your inbox for the styled verification email
3. Make any adjustments as needed

## Template Features

✨ **Retro-themed design** matching your app's aesthetic  
🎨 **Pink/cyan gradient** with neon glow effects  
📱 **Responsive layout** that works on all email clients  
🔘 **Large CTA button** that's easy to click  
📋 **Features list** highlighting what awaits the user  
🔗 **Fallback link** in case the button doesn't work  

## Other Email Templates You Can Customize

In the same Email Templates section, you can also customize:
- **Invite user** - When inviting users to your app
- **Magic Link** - For passwordless login
- **Change Email Address** - When users update their email
- **Reset Password** - For password recovery

Simply apply the same design principles to maintain consistency!

## Notes

- The template uses inline CSS (required for email compatibility)
- All colors are hardcoded since email clients don't support CSS variables
- The design matches your app's retro/synthwave theme (pink #e94560, dark blues)
- Variables like `{{ .ConfirmationURL }}` are automatically replaced by Supabase

## Preview

The email features:
- Eye-catching header with gradient background
- Friendly, conversational tone
- Clear call-to-action button with glow effect
- List of features to excite new users
- Professional footer with important notes
