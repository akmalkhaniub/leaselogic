import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const models = [
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-latest',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229'
];

async function testModels() {
  console.log("Testing Anthropic models...");
  for (const model of models) {
    try {
      console.log(`Trying ${model}...`);
      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hi' }],
      });
      console.log(`✅ Success with ${model}:`, response.content[0].text);
      return model; // Exit once we find a working model
    } catch (err) {
      console.log(`❌ Failed with ${model}:`, err.message);
    }
  }
}

testModels();
