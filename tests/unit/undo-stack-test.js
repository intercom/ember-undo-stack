import { A } from '@ember/array';
import EmberObject, { computed } from '@ember/object';
import { on } from '@ember/object/evented';
import UndoStack from 'ember-undo-stack/undo-stack';
import { module, test } from 'qunit';

module('UndoStack', function() {
  var Cat = EmberObject.extend(UndoStack, {
    name: '',
    age: 1,
    kittens: null,
    info: computed('name', 'age', 'kittens', 'kittens.@.checkpointData', function() {
      const name = this.get('name');
      const age = this.get('age');
      const kittensLength = this.get('kittens.length');
      return `${name} (${age}) has ${kittensLength} kittens`;
    }),
    setup: on('init', function() {
      this.set('kittens', A());
    }),
    checkpointData: computed('name', 'age', 'kittens.@.checkpointData', function() {
      return {
        name: this.get('name'),
        age: this.get('age'),
        kittens: this.get('kittens').map(m => m.checkpointData)
      };
    }),
    restoreCheckpoint(data) {
      this.setProperties({ name: data.name, age: data.age });
      const kittens = this.get('kittens');
      kittens.clear();
      data.kittens.forEach((kittenData) => {
        kittens.pushObject(Cat.restoreCheckpoint(kittenData));
      });
      return this;
    }
  }).reopenClass({
    deserialize(data) {
      return Cat.create().deserialize(data);
    }
  });

  test('simple undo and redo', function(assert) {
    const cat = Cat.create({ name: 'Sully', age: 7 });

    assert.equal(cat.get('info'), 'Sully (7) has 0 kittens');
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');

    cat.checkpoint();
    assert.equal(cat.get('undoStackInfo'), 'undo: [1] redo: [0]');

    cat.set('name', 'Sooty');
    assert.equal(cat.get('info'), 'Sooty (7) has 0 kittens');

    cat.undo();
    assert.equal(cat.get('info'), 'Sully (7) has 0 kittens');
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [1]');

    cat.redo();
    assert.equal(cat.get('info'), 'Sooty (7) has 0 kittens');
    assert.equal(cat.get('undoStackInfo'), 'undo: [1] redo: [0]');
  });

  test('a checkpointData computed property must be provided', (assert) => {
    const Dog = EmberObject.extend(UndoStack);

    assert.throws(function () {
      Dog.create({ name: 'Fudge' });
    }, /Please implement a `checkpointData` computed property/);
  });

  test('a restoreCheckpoint function must be provided', (assert) => {
    const Dog = EmberObject.extend(UndoStack, {
      name: 'Snoopy',
      checkpointData: computed('name', function() {
        return this.get('name');
      })
    });

    assert.throws(function () {
      const dog = Dog.create({ name: 'Fudge' });
      dog.checkpoint();
      dog.set('name', 'Charlie');
      dog.undo();
    }, /Please implement a `restoreCheckpoint` function/);
  });

  test('undo and redo with child objects', (assert) => {
    const cat = Cat.create({ name: 'Sully', age: 7 });
    cat.checkpoint();

    cat.set('name', 'Tiger');
    cat.set('age', 13);
    cat.get('kittens').pushObject(
      Cat.create({
        name: 'Kitty'
      })
    );

    assert.equal(cat.get('info'), 'Tiger (13) has 1 kittens');
    cat.checkpoint();
    assert.equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');

    cat.undo();
    assert.equal(cat.get('info'), 'Sully (7) has 0 kittens');
  });

  test('a checkpoint should clear the redo stack', (assert) => {
    const cat = Cat.create({ name: 'Sully', age: 7 });
    cat.checkpoint();

    cat.set('name', 'Alex');
    cat.checkpoint();

    cat.set('name', 'Bob');
    cat.undo();

    assert.equal(cat.get('undoStackInfo'), 'undo: [1] redo: [1]');

    cat.set('name', 'Sarah');
    cat.checkpoint();
    assert.equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');

    cat.undo();
    cat.redo();
    assert.equal(cat.get('info'), 'Sarah (7) has 0 kittens');
  });

  test('a checkpoint is only saved when there have been changes', (assert) => {
    const cat = Cat.create({ name: 'Sooty', age: 16 });
    cat.checkpoint();
    cat.set('age', 22);
    cat.checkpoint();
    assert.equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');
    cat.checkpoint();
    cat.checkpoint();
    assert.equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');
  });

  test('calling undo when there is no undo history is allowed', (assert) => {
    const cat = Cat.create({ name: 'Sooty', age: 16 });

    assert.equal(cat.get('info'), 'Sooty (16) has 0 kittens');
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');

    cat.undo();
    cat.undo();

    assert.equal(cat.get('info'), 'Sooty (16) has 0 kittens');
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');
  });

  test('calling redo when there is no redo history is allowed', (assert) => {
    const cat = Cat.create({ name: 'Sully', age: 17 });

    assert.equal(cat.get('info'), 'Sully (17) has 0 kittens');
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');

    cat.redo();
    cat.redo();

    assert.equal(cat.get('info'), 'Sully (17) has 0 kittens');
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');
  });

  test('the undo stack has a maximum depth', (assert) => {
    const cat = Cat.create({ undoStackMaxDepth: 3 });

    for(var i=1; i<=10; i++) {
      cat.set('age', i);
      cat.checkpoint();
    }

    assert.equal(cat.get('undoStackInfo'), 'undo: [3] redo: [0]');
    assert.equal(cat.get('age'), 10);

    cat.set('age', 99);
    cat.undo();
    assert.equal(cat.get('undoStackInfo'), 'undo: [2] redo: [1]');
    assert.equal(cat.get('age'), 10);

    cat.undo();
    assert.equal(cat.get('undoStackInfo'), 'undo: [1] redo: [2]');
    assert.equal(cat.get('age'), 9);

    cat.undo();
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [3]');
    assert.equal(cat.get('age'), 8);

    cat.undo();
    assert.equal(cat.get('undoStackInfo'), 'undo: [0] redo: [3]');
    assert.equal(cat.get('age'), 8);
  });

  test('modified objects do not get put on the undo stack when redoing', (assert) => {
    const cat = Cat.create({ name: 'Sully', age: 7 });

    assert.equal(cat.get('info'), 'Sully (7) has 0 kittens');
    cat.checkpoint();
    cat.set('name', 'Sooty');
    cat.checkpoint();
    cat.undo();
    cat.set('name', 'Brian');
    cat.redo();
    assert.equal(cat.get('info'), 'Sooty (7) has 0 kittens');
  });

  test('undo after redo works', (assert) => {
    const cat = Cat.create({ name: 'Sully', age: 7 });
    cat.checkpoint();

    assert.equal(cat.get('info'), 'Sully (7) has 0 kittens');

    cat.set('name', 'Sooty');
    cat.checkpoint();
    cat.set('name', 'Brian');
    cat.checkpoint();
    cat.set('name', 'Charlie');
    cat.checkpoint();

    cat.undo();
    cat.undo();
    assert.equal(cat.get('info'), 'Sooty (7) has 0 kittens');
    cat.redo();
    cat.redo();
    assert.equal(cat.get('info'), 'Charlie (7) has 0 kittens');
    cat.undo();
    assert.equal(cat.get('info'), 'Brian (7) has 0 kittens');
  });
});
