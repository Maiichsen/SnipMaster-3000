// service worker
// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  
  console.log('Notification clicked:', action);
  
  notification.close();
  
  if (action === 'view') {
    // Open window and focus it
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(clientList => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window/tab is open, open one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});