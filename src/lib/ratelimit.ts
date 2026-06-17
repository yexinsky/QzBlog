// Re-export from rate-limit.ts for backward compatibility
export {
  commentRatelimit,
  loginRatelimit,
  globalRatelimit,
  momentRatelimit,
  getClientIP,
  checkRatelimit,
  createRatelimitHeaders,
  createRatelimitResponse,
  withRatelimit,
} from './rate-limit';
