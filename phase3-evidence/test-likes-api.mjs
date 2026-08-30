const testCases = [
  { name: 'no-postId-empty-body', body: '{}' },
  { name: 'no-postId-null', body: JSON.stringify({postId: null}) },
  { name: 'no-postId-empty-string', body: JSON.stringify({postId: ''}) },
  { name: 'no-postId-bad-uuid', body: JSON.stringify({postId: 'not-a-uuid'}) },
  { name: 'no-postId-numeric', body: JSON.stringify({postId: 123}) },
  { name: 'no-postId-array', body: JSON.stringify({postId: []}) },
  { name: 'no-postId-object', body: JSON.stringify({postId: {}}) },
  { name: 'valid-uuid-not-in-db', body: JSON.stringify({postId: '00000000-0000-0000-0000-000000000000'}) },
];

(async () => {
  for (const tc of testCases) {
    console.log('\n--- Test:', tc.name, '---');
    console.log('Body:', tc.body);
    try {
      const res = await fetch('http://localhost:3001/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: tc.body
      });
      const text = await res.text();
      console.log('Status:', res.status);
      try {
        const json = JSON.parse(text);
        console.log('JSON Response:', JSON.stringify(json, null, 2));
      } catch {
        console.log('Raw Response:', text);
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
})();
