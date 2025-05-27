# Exercise 1: PWA Lighthouse Audit



## Step 1: Set Up for Testing (5 minutes)

1. **Launch your development server**
   ```bash
   # Start your local server (command may vary based on your setup)
   npm start
   ```

2. **Open your PWA in Chrome**
   - Navigate to your local development URL (typically http://localhost:8080)
   - Make sure the page is fully loaded

3. **Prepare DevTools**
   - Open Chrome DevTools (F12 or Right-click → Inspect)
   - Go to the Application tab to verify your service worker is active
   - Check that your manifest is properly configured

## ~~Step 2: Run Initial Lighthouse Audit (NO!! PWA Builder)~~

~~1. **Access Lighthouse in Chrome DevTools**~~
  ~~Click on the "Lighthouse" tab in DevTools~~

~~2. **Configure audit settings**~~
~~- Select the following categories:~~
     ~~- [x] Performance~~
     ~~- [x] Progressive Web App~~
     ~~- [x] Best Practices~~
     ~~- [x] Accessibility~~
   ~~- Device: Mobile~~
   ~~- Mode: Navigation~~

~~3. ~~**Run the audit**~~
   ~~- Click "Analyze page load"~~
   ~~- Wait for the audit to complete (this may take a minute)~~

~~4. **Save the report**~~
   ~~- Click "Save HTML" from the menu in the report~~
   ~~- Save the file as "lighthouse-initial-audit.html" in your project folder~~

## Step 3: Analyze PWA Results

1. **Review the PWA section of the report**
   - Look for failed audits first (shown in red)
   - Note "passed with warnings" items (shown in orange)
   - Review passed items to ensure they continue working

2. **Create an issues document**
   - Create a file named "pwa-audit-issues.md" in your project
   - For each failed or warning item, document:
     - Issue name
     - Issue description
     - Current status (failed/warning)
     - Priority (high/medium/low)
     - Proposed solution

3. **Focus on key PWA areas**
   - Installability issues
   - Service worker problems
   - Offline capabilities
   - Web App Manifest issues
   - HTTPS requirements

Use this template for your issues document:

```markdown
# SnipMaster 3000 PWA Audit Issues

## Failed Items

### [Issue Name]
- **Description**: [Copy from Lighthouse report]
- **Status**: Failed
- **Priority**: High/Medium/Low
- **Proposed Solution**: [Your ideas to fix]

### [Next Issue]
...

## Warning Items

### [Issue Name]
- **Description**: [Copy from Lighthouse report]
- **Status**: Warning
- **Priority**: High/Medium/Low
- **Proposed Solution**: [Your ideas to fix]

### [Next Issue]
...

## Priority Improvements for Today
1. [Top priority issue]
2. [Second priority issue]
3. [Third priority issue]
```

## Step 4: Manually Test Key PWA Features

After analyzing the Lighthouse report, manually test these critical PWA features:

1. **Offline functionality**
   - In DevTools, go to Network tab
   - Check "Offline" checkbox
   - Reload the page
   - Document how your app behaves when offline
   - Try to create a new snippet while offline

2. **Installation flow**
   - Look for install prompt or button
   - Attempt to install your PWA
   - If installation fails, document what happens
   - If it succeeds, test the installed version

3. **Service worker behavior**
   - Go to Application → Service Workers in DevTools
   - Check service worker status
   - Click "Update on reload" and reload page
   - Check if update is handled correctly

4. **Load performance**
   - Go to Network tab
   - Select "Slow 3G" from the throttling dropdown
   - Reload the page
   - Measure load time and performance

Add your findings to the issues document in a new section:

```markdown
## Manual Testing Results

### Offline Functionality
- **Status**: [Working/Partially Working/Not Working]
- **Observations**: [What you observed]
- **Issues Found**: [Any issues not caught by Lighthouse]

### Installation Flow
- **Status**: [Working/Partially Working/Not Working]
- **Observations**: [What you observed]
- **Issues Found**: [Any issues not caught by Lighthouse]

### Service Worker
- **Status**: [Working/Partially Working/Not Working]
- **Observations**: [What you observed]
- **Issues Found**: [Any issues not caught by Lighthouse]

### Performance
- **Load Time**: [Measured time on slow 3G]
- **Observations**: [What you observed]
- **Issues Found**: [Any issues not caught by Lighthouse]
```

## Verification Checklist

Use this checklist to ensure you've completed all parts of the exercise:

- [ ] Lighthouse audit completed successfully (PWA Builder)
- [ ] Audit report saved as HTML
- [ ] Issues documented with priorities
- [ ] Manual testing of offline functionality completed
- [ ] Manual testing of installation flow completed
- [ ] Manual testing of service worker behavior completed
- [ ] Performance testing on slow connection completed
- [ ] Priority improvements identified for afternoon implementation

## Common Issues and Solutions

Here are some common issues you might encounter and how to address them:

1. **Manifest missing properties**
   - Check manifest.json for required fields: name, short_name, icons, start_url, display
   - Ensure icon sizes include at least 192x192 and 512x512

2. **Service worker not registered**
   - Verify registration code in your main JavaScript file
   - Check console for registration errors

3. **App doesn't work offline**
   - Check cache configuration in service worker
   - Ensure critical files are included in precache list
   - Verify fetch event handler provides offline responses

4. **Installation not working**
   - Ensure all installability criteria are met
   - Check HTTPS (or localhost) requirement
   - Verify manifest is properly linked

## Bonus Tasks (if time permits)

If you finish early, try one of these additional tasks:

1. **Test on a real mobile device**
   - Use remote debugging or deploy to a staging server
   - Test installation and offline functionality on a phone

2. **Try the PWA Builder assessment tool**
   - Visit https://www.pwabuilder.com/
   - Enter your local URL or a deployed version
   - Compare results with Lighthouse findings

3. **Create a simple checklist for daily PWA testing**
   - Based on your findings, create a quick checklist for ongoing testing
   - Include the most critical items to check regularly