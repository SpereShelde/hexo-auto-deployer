const config = require('./config');

if (config.method.toLowerCase() === 'onedrive') {
  console.log('Method oneDrive selected.')
  const OneDrivePublisher = require('./src/oneDrivePublisher');
  const oneDrivePublisher = new OneDrivePublisher(config.oneDrive);
  oneDrivePublisher.start();
} else if (config.method.toLowerCase() === 'local') {
  console.log('Method local selected.')
  const LocalPublisher = require('./src/localPublisher');
  const localPublisher = new LocalPublisher(config.local);
  localPublisher.start();
}