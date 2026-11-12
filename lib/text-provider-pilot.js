// Isolated pilot: deliberately not imported by server.js until live/privacy acceptance.
import {runProviderRequest} from './provider-request.js';
const fail=(message,status=422)=>Object.assign(new Error(message),{status,code:'TEXT_PILOT_ERROR'});
export async function runTextPilot({enabled=false, apiKey, task, messages, json=false, validate,
  signal, fetchImpl=fetch, geminiFallback, allowFallback=false, timeoutMs=15000}) {
  if(!enabled)throw fail('Text provider pilot is disabled.',503);
  if(!apiKey || !['chat','summary','quiz'].includes(task))throw fail('Pilot key or text task is invalid.',400);
  if(!Array.isArray(messages)||!messages.length||messages.length>25||messages.some(m=>!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim())||JSON.stringify(messages).length>16000)throw fail('Pilot accepts bounded text messages only.',400);
  if(json && typeof validate!=='function')throw fail('Structured output requires a task validator.',400);
  const started=Date.now();
  const {result,model}=await runProviderRequest({
    models:allowFallback && geminiFallback ? ['groq','gemini'] : ['groq'],
    timeoutMs:Math.min(30000,Math.max(1,timeoutMs)),attemptTimeoutMs:Math.min(10000,Math.max(1,timeoutMs)),signal,
    invoke:async(provider,budget,abortSignal)=>{
      if(provider==='gemini')return geminiFallback({messages,json,signal:abortSignal,timeoutMs:budget});
      const response=await fetchImpl('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',redirect:'error',signal:abortSignal,
        headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({model:'openai/gpt-oss-20b',messages,stream:false,max_completion_tokens:2048,...(json?{response_format:{type:'json_object'}}:{})})
      });
      // Never reflect upstream bodies, prompts or credential-bearing errors to callers.
      if(!response.ok){await response.body?.cancel();throw fail(`Text provider HTTP ${response.status}`,response.status);}
      const reader=response.body.getReader();let bytes=0;const chunks=[];
      try {while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>262144)throw fail('Text provider response exceeds limit.');chunks.push(Buffer.from(value));}}
      finally {await reader.cancel().catch(()=>{});}
      let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('Invalid provider response.');}
      const choice=data.choices?.[0],text=choice?.message?.content;
      if(choice?.finish_reason!=='stop'||typeof text!=='string'||!text.trim())throw fail('Incomplete provider output.');
      if(json){let parsed;try{parsed=JSON.parse(text);}catch{throw fail('Invalid structured output.');}validate(parsed);}
      return {text:text.trim(),actualModel:'openai/gpt-oss-20b',usage:data.usage?{inputTokens:data.usage.prompt_tokens??null,outputTokens:data.usage.completion_tokens??null,totalTokens:data.usage.total_tokens??null}:null};
    }
  });
  return {...result,provider:model,fallbackUsed:model==='gemini',latencyMs:Date.now()-started};
}
