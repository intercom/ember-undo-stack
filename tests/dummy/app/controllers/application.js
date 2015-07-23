import Em from 'ember';
import UndoStack from 'ember-undo-stack/undo-stack';

const { computed, observer, Controller } = Em;

export default Controller.extend(UndoStack, {
  story: 'Once upon a time...',
  autoCheckpointEnabled: true,

  checkpointData: computed('story', function() {
    return {
      story: this.get('story')
    };
  }),

  restoreCheckpoint(data) {
    this.set('autoCheckpointEnabled', false);
    this.set('story', data.story);
    this.set('autoCheckpointEnabled', true);
  },

  onStoryChange: observer('story', function() {
    if(this.get('autoCheckpointEnabled')) {
      this.throttledCheckpoint();
    }
  }),

  actions: {
    checkpoint() {
      this.checkpoint();
    },
    undo() {
      this.undo();
    },
    redo() {
      this.redo();
    }
  }
});
