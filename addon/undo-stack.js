import Em from 'ember';

export default Em.Mixin.create({
  undoCheckpointThrottleInMilliseconds: 800,
  undoStackMaxDepth: 50,

  _undo_stack_setup: function() {
    this.set('undoStack', Em.A());
    this.set('redoStack', Em.A());
    this.get('checkpointData');
  }.on('init'),

  undoStack: null,
  redoStack: null,
  canUndo: Em.computed.notEmpty('undoStack'),
  cantUndo: Em.computed.not('canUndo'),
  canRedo: Em.computed.notEmpty('redoStack'),
  cantRedo: Em.computed.not('canRedo'),

  checkpointData: Em.computed(function() {
    throw 'Please implement a `checkpointData` computed property';
  }),

  restoreCheckpoint: function() {
    throw 'Please implement a `restoreCheckpoint` function';
  },

  undoStackInfo: function() {
    return 'undo: [%@] redo: [%@]'.fmt(this.get('undoStack.length'), this.get('redoStack.length'));
  }.property('undoStack.length', 'redoStack.length'),

  checkpointsToRemoveCount: function() {
    return this.get('undoStack.length') - this.get('undoStackMaxDepth');
  }.property('undoStack.length', 'undoStackMaxDepth'),

  hasCheckpointsToRemove: Em.computed.gt('checkpointsToRemoveCount', 0),

  throttledCheckpoint: function() {
    Em.run.throttle(this, this.checkpoint, this.get('undoCheckpointThrottleInMilliseconds'), true);
  },

  checkpoint: function() {
    var checkpointData = this.get('checkpointData');

    if(checkpointData !== this.get('undoStack.lastObject')) {
      this.get('undoStack').pushObject(checkpointData);
      this.get('redoStack').clear();
    }

    if(this.get('hasCheckpointsToRemove')) {
      this.get('undoStack').removeAt(0, this.get('undoStackCheckpointsToRemoveCount'));
    }
  },

  undo: function() {
    if(this.get('canUndo')) {
      var current = this.get('checkpointData');

      var last = this.get('undoStack').popObject();
      if(current !== last) {
        this.restoreCheckpoint(last);
        this.get('redoStack').pushObject(current);
      } else {
        this.undo();
      }
    }
  },

  redo: function() {
    if(this.get('canRedo')) {
      var current = this.get('checkpointData');
      var last = this.get('redoStack').popObject();
      this.restoreCheckpoint(last);
      this.get('undoStack').pushObject(current);
    }
  }
});
