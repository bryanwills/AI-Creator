import {describe, expect, it} from 'vitest';
import {applyAgentEvent, appendLocalUser, composeAgentPrompt, createChatState, humanize} from './events';

describe('agent event mapping', () => {
  it('streams assistant text into one message', () => {
    let state = appendLocalUser(createChatState(), 'Make a short film');
    state = applyAgentEvent(state, {type: 'turn', turn_id: 'turn-1'});
    state = applyAgentEvent(state, {type: 'token', turn_id: 'turn-1', delta: 'Planning'});
    state = applyAgentEvent(state, {type: 'token', turn_id: 'turn-1', delta: ' ready'});
    state = applyAgentEvent(state, {type: 'done', turn_id: 'turn-1'});
    expect(state.messages.at(-1)).toMatchObject({role: 'assistant', text: 'Planning ready'});
    expect(state.busy).toBe(false);
  });

  it('updates a running tool instead of appending every progress event', () => {
    let state = createChatState();
    state = applyAgentEvent(state, {type: 'tool_start', turn_id: 'turn-1', tool: {id: 'tool-1', name: 'vimax_render_video'}});
    state = applyAgentEvent(state, {type: 'tool_progress', turn_id: 'turn-1', tool: {name: 'vimax_render_video'}, progress: {stage: 'generate_frames', message: 'Generating frames'}});
    state = applyAgentEvent(state, {type: 'tool_result', turn_id: 'turn-1', tool_result: {name: 'vimax_render_video', ok: true}});
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({tool: 'vimax_render_video', status: 'done', text: 'Completed'});
  });

  it('keeps each composer submission on one stdin line', () => {
    expect(composeAgentPrompt('first line\nsecond line', 'script2video')).toBe(
      'I prefer the script2video workflow for this request. first line second line',
    );
    expect(humanize('vimax_narrative_planning')).toBe('ViMax Narrative Planning');
  });
});
