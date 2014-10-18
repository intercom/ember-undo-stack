import Em from 'ember';
import UndoStack from 'ember-undo-stack/undo-stack'

export default Em.Controller.extend(UndoStack, {
  story: 'Once upon a time...',
  autoCheckpointEnabled: true,

  checkpointData: function() {
    return {
      story: this.get('story')
    }
  }.property('story'),

  restoreCheckpoint: function(data) {
    this.set('autoCheckpointEnabled', false);
    this.set('story', data.story);
    this.set('autoCheckpointEnabled', true);
  },

  onStoryChange: function() {
    if(this.get('autoCheckpointEnabled')) {
      this.throttledCheckpoint();
    }
  }.observes('story'),

  actions: {
    checkpoint: function() {
      this.checkpoint();
    },
    undo: function() {
      this.undo();
    },
    redo: function() {
      this.redo();
    }
  }
});
