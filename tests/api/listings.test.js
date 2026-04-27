import handler from '../../api/listings.js';

// Mock Response to simulate standard behavior in Node environment if needed
// Actually Jest >= 28 with JSDOM or Node 18+ has native fetch/Request/Response
// We can use global.Request and global.Response

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnValue({ data: [{ id: 1, title: 'Test Property' }], error: null }),
  }))
}));

describe('Listings API', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_ANON_KEY = 'test-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for unsupported methods', async () => {
    const req = new Request('http://localhost/api/listings', {
      method: 'PUT',
    });
    const res = await handler(req);
    expect(res.status).toBe(405);
  });

  it('should get listings successfully', async () => {
    const req = new Request('http://localhost/api/listings', {
      method: 'GET',
    });

    const res = await handler(req);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.result).toHaveLength(1);
    expect(json.result[0].title).toBe('Test Property');
  });

  it('should create a listing when valid POST data is sent', async () => {
    const payload = { title: 'New Property', type: '매매', price: 50000, description: 'Good' };
    const req = new Request('http://localhost/api/listings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const { createClient } = await import('@supabase/supabase-js');
    createClient().insert.mockReturnValueOnce({ error: null });

    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toBe('매물이 등록되었습니다.');
  });
  
  it('should return 400 when creating a listing without required fields', async () => {
    const payload = { title: 'New Property' }; // Missing type, price
    const req = new Request('http://localhost/api/listings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/필수 정보가 누락/);
  });
});
