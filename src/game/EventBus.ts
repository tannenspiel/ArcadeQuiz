import Phaser from 'phaser';
import { logger } from '../utils/Logger';

// A simple event bus to bridge React and Phaser
export const EventBus = new Phaser.Events.EventEmitter();

// Debug: Override emit to log all events (without args to avoid serialization lag)
const originalEmit = EventBus.emit.bind(EventBus);
EventBus.emit = function(event: string, ...args: any[]) {
    // Only log event name, not args - args can contain complex Phaser objects
    // that cause serialization errors and performance issues
    logger.log('EVENT_BUS', `EventBus.emit: ${event}`);
    return originalEmit(event, ...args);
};

