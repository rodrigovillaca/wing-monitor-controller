import { MonitorServer } from '@wing-monitor/monitor-backend';
import { config as wingConfig, MOCK_MODE } from './config';
import { APP_CONFIG } from '@wing-monitor/shared-models';
import path from 'path';

async function main() {
  try {
    console.log('Starting Wing Monitor Controller API...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Mock Mode: ${MOCK_MODE}`);
    
    // Determine static path for serving the frontend
    // In production (built), it might be different than dev
    const staticPath = path.join(process.cwd(), 'dist/apps/web-client');
    
    const server = new MonitorServer(
      wingConfig,
      APP_CONFIG.API_PORT,
      MOCK_MODE,
      staticPath
    );

    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down...');
      server.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down...');
      server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
