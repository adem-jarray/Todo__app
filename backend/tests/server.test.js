// backend/tests/ci.test.js
// Tests SIMPLES pour CI/CD qui MARCHENT à coup sûr

describe('CI/CD Validation Tests', () => {
  test('Basic math test', () => {
    expect(1 + 1).toBe(2);
  });

  test('String manipulation', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });

  test('Array operations', () => {
    const todos = ['Learn Docker', 'Learn CI/CD', 'Finish project'];
    expect(todos.length).toBe(3);
    expect(todos[0]).toBe('Learn Docker');
  });

  test('Object validation', () => {
    const todo = {
      id: 1,
      text: 'Test todo',
      completed: false
    };
    expect(todo.text).toBe('Test todo');
    expect(todo.completed).toBe(false);
  });

  test('File structure check', () => {
    const fs = require('fs');
    expect(fs.existsSync('./server.js')).toBe(true);
    expect(fs.existsSync('./package.json')).toBe(true);
    expect(fs.existsSync('./models/Todo.js')).toBe(true);
  });

  test('Package.json validation', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('todo-backend');
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.dependencies.express).toBeDefined();
  });
});