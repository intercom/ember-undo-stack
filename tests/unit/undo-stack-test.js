import Em from 'ember';
import UndoStack from 'ember-undo-stack/undo-stack';

module('UndoStack');

var Cat = Em.Object.extend(UndoStack, {
  name: '',
  age: 1,
  kittens: null,
  info: function() {
    return "%@ (%@) has %@ kittens".fmt(this.get('name'), this.get('age'), this.get('kittens.length'));
  }.property('name', 'age', 'kittens', 'kittens.@.checkpointData'),
  setup: function() {
    this.set('kittens', Em.A());
  }.on('init'),
  checkpointData: function() {
    return {
      name: this.get('name'),
      age: this.get('age'),
      kittens: this.get('kittens').mapProperty('checkpointData')
    };
  }.property('name', 'age', 'kittens.@.checkpointData'),
  restoreCheckpoint: function(data) {
    this.setProperties({ name: data.name, age: data.age });
    var kittens = this.get('kittens');
    kittens.clear();
    data.kittens.forEach(function(kittenData) {
      kittens.pushObject(Cat.restoreCheckpoint(kittenData));
    });
    return this;
  }
}).reopenClass({
  deserialize: function(data) {
    return Cat.create().deserialize(data);
  }
});

test('simple undo and redo', function() {
  var cat = Cat.create({ name: 'Sully', age: 7 });

  equal(cat.get('info'), 'Sully (7) has 0 kittens');
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');

  cat.checkpoint();
  equal(cat.get('undoStackInfo'), 'undo: [1] redo: [0]');

  cat.set('name', 'Sooty');
  equal(cat.get('info'), 'Sooty (7) has 0 kittens');

  cat.undo();
  equal(cat.get('info'), 'Sully (7) has 0 kittens');
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [1]');

  cat.redo();
  equal(cat.get('info'), 'Sooty (7) has 0 kittens');
  equal(cat.get('undoStackInfo'), 'undo: [1] redo: [0]');
});

test('a checkpointData computed property must be provided', function() {
  var Dog = Em.Object.extend(UndoStack);

  throws(function () {
    var dog = Dog.create({ name: 'Fudge' });
  }, /Please implement a `checkpointData` computed property/);
});

test('a restoreCheckpoint function must be provided', function() {
  var Dog = Em.Object.extend(UndoStack, {
    name: 'Snoopy',
    checkpointData: function() {
      return this.get('name');
    }.property('name')
  });

  throws(function () {
    var dog = Dog.create({ name: 'Fudge' });
    dog.checkpoint();
    dog.set('name', 'Charlie');
    dog.undo();
  }, /Please implement a `restoreCheckpoint` function/);
});

test('undo and redo with child objects', function() {
  var cat = Cat.create({ name: 'Sully', age: 7 });
  cat.checkpoint();

  cat.set('name', 'Tiger');
  cat.set('age', 13);
  cat.get('kittens').pushObject(
    Cat.create({
      name: 'Kitty'
    })
  );

  equal(cat.get('info'), 'Tiger (13) has 1 kittens');
  cat.checkpoint();
  equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');

  cat.undo();
  equal(cat.get('info'), 'Sully (7) has 0 kittens');
});

test('a checkpoint should clear the redo stack', function() {
  var cat = Cat.create({ name: 'Sully', age: 7 });
  cat.checkpoint();

  cat.set('name', 'Alex');
  cat.checkpoint();

  cat.set('name', 'Bob');
  cat.undo();

  equal(cat.get('undoStackInfo'), 'undo: [1] redo: [1]');

  cat.set('name', 'Sarah');
  cat.checkpoint();
  equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');

  cat.undo();
  cat.redo();
  equal(cat.get('info'), 'Sarah (7) has 0 kittens');
});

test('a checkpoint is only saved when there have been changes', function() {
  var cat = Cat.create({ name: 'Sooty', age: 16 });
  cat.checkpoint();
  cat.set('age', 22);
  cat.checkpoint();
  equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');
  cat.checkpoint();
  cat.checkpoint();
  equal(cat.get('undoStackInfo'), 'undo: [2] redo: [0]');
});

test('calling undo when there is no undo history is allowed', function() {
  var cat = Cat.create({ name: 'Sooty', age: 16 });

  equal(cat.get('info'), 'Sooty (16) has 0 kittens');
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');

  cat.undo();
  cat.undo();

  equal(cat.get('info'), 'Sooty (16) has 0 kittens');
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');
});

test('calling redo when there is no redo history is allowed', function() {
  var cat = Cat.create({ name: 'Sully', age: 17 });

  equal(cat.get('info'), 'Sully (17) has 0 kittens');
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');

  cat.redo();
  cat.redo();

  equal(cat.get('info'), 'Sully (17) has 0 kittens');
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [0]');
});

test('the undo stack has a maximum depth', function() {
  var cat = Cat.create({ undoStackMaxDepth: 3 });

  for(var i=1; i<=10; i++) {
    cat.set('age', i);
    cat.checkpoint();
  }

  equal(cat.get('undoStackInfo'), 'undo: [3] redo: [0]');
  equal(cat.get('age'), 10);

  cat.set('age', 99);
  cat.undo();
  equal(cat.get('undoStackInfo'), 'undo: [2] redo: [1]');
  equal(cat.get('age'), 10);

  cat.undo();
  equal(cat.get('undoStackInfo'), 'undo: [1] redo: [2]');
  equal(cat.get('age'), 9);

  cat.undo();
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [3]');
  equal(cat.get('age'), 8);

  cat.undo();
  equal(cat.get('undoStackInfo'), 'undo: [0] redo: [3]');
  equal(cat.get('age'), 8);
});
