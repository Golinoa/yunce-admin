import { jest } from '@jest/globals';

// 全局测试配置
jest.setTimeout(10000);

// 模拟环境变量
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_only_32chars';
process.env.DATABASE_URL = 'mysql://root:root123@localhost:3306/xiaoke_test';
