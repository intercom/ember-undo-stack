import Em from 'ember';

const { computed, on, run } = Em;

export default Em.Mixin.create({
  undoCheckpointThrottleInMilliseconds: 800,
  undoStackMaxDepth: 50,

  _undo_stack_setup: on('init', function() {
    this.set('undoStack', Em.A());
    this.set('redoStack', Em.A());
    this.get('checkpointData');
  }),

  undoStack: null,
  redoStack: null,
  canUndo: computed.notEmpty('undoStack'),
  cantUndo: computed.not('canUndo'),
  canRedo: computed.notEmpty('redoStack'),
  cantRedo: computed.not('canRedo'),

  checkpointData: computed(function() {
    throw 'Please implement a `checkpointData` computed property';
  }),

  restoreCheckpoint() {
    throw 'Please implement a `restoreCheckpoint` function';
  },

  undoStackInfo: computed('undoStack.length', 'redoStack.length', function() {
    const undoLength = this.get('undoStack.length');
    const redoLength = this.get('redoStack.length');
    return `undo: [${undoLength}] redo: [${redoLength}]`;
  }),

  checkpointsToRemoveCount: computed('undoStack.length', 'undoStackMaxDepth', function() {
    return this.get('undoStack.length') - this.get('undoStackMaxDepth');
  }),

  hasCheckpointsToRemove: computed.gt('checkpointsToRemoveCount', 0),

  throttledCheckpoint() {
    run.throttle(this, this.checkpoint, this.get('undoCheckpointThrottleInMilliseconds'), true);
  },

  checkpoint() {
    const checkpointData = this.get('checkpointData');

    if(checkpointData !== this.get('undoStack.lastObject')) {
      this.get('undoStack').pushObject(checkpointData);
      this.get('redoStack').clear();
      this.set('_undoStackCurrent', checkpointData);
    }

    if(this.get('hasCheckpointsToRemove')) {
      this.get('undoStack').removeAt(0, this.get('undoStackCheckpointsToRemoveCount'));
    }
  },

  undo() {
    if(this.get('canUndo')) {
      const current = this.get('checkpointData');
      const last = this.get('undoStack').popObject();

      if(current !== last) {
        this.set('_undoStackCurrent', last);
        this.restoreCheckpoint(last);
        this.get('redoStack').pushObject(current);
      } else {
        this.undo();
      }
    }
  },

  redo() {
    if(this.get('canRedo')) {
      const current = this.get('_undoStackCurrent');
      const last = this.get('redoStack').popObject();
      this.restoreCheckpoint(last);
      this.set('_undoStackCurrent', last);
      this.get('undoStack').pushObject(current);
    }
  }
});
