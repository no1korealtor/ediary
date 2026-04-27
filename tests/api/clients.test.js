import handler from '../../api/clients.js';

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnValue({ data: [{ id: 1, name: 'John Doe', inquiry_type: '매수' }], error: null }),
  }))
}));

describe('Clients API', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_ANON_KEY = 'test-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 405 for unsupported methods', async () => {
    const req = new Request('http://localhost/api/clients', {
      method: 'PUT',
    });
    const res = await handler(req);
    expect(res.status).toBe(405);
  });

  it('should get clients successfully', async () => {
    const req = new Request('http://localhost/api/clients', {
      method: 'GET',
    });

    const res = await handler(req);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.result).toHaveLength(1);
    expect(json.result[0].name).toBe('John Doe');
  });

  it('should create a client when valid POST data is sent', async () => {
    const payload = { name: 'New Client', phone: '010-1234-5678', inquiry_type: '매수', notes: 'ASAP' };
    const req = new Request('http://localhost/api/clients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const { createClient } = await import('@supabase/supabase-js');
    createClient().insert.mockReturnValueOnce({ error: null });

    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toBe('의뢰인이 등록되었습니다.');
  });
  
  it('should return 400 when creating a client without required fields', async () => {
    const payload = { inquiry_type: '매수' }; // Missing name, phone
    const req = new Request('http://localhost/api/clients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/필수 정보가 누락/);
  });
});
