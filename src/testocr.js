const axios = require('axios');

console.log('🧪 Testing direct Ollama connection...');

axios.post('http://localhost:11434/api/generate', {
  model: 'llama3.2:3b',
  prompt: 'Hello world test',
  stream: false
}, {
  timeout: 30000
})
.then(res => {
  console.log('✅ SUCCESS! Ollama responded');
  console.log('Response:', res.data.response);
})
.catch(err => {
  console.log('❌ FAILED');
  console.log('Error:', err.code || err.message);
  console.log('URL tried:', err.config?.url);
});
