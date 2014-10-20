# ember-undo-stack

[![Build Status](https://travis-ci.org/intercom/ember-undo-stack.svg)](https://travis-ci.org/intercom/ember-undo-stack)

A simple undo/redo stack for Ember.js objects

Questions? Ping me [@gavinjoyce](https://twitter.com/gavinjoyce)

## Installation

This is an Ember CLI addon, to install:

`npm install ember-undo-stack --save`

## Demo

![undo2](https://cloud.githubusercontent.com/assets/2526/4691232/8050d014-570d-11e4-86df-93442c590304.gif)

## Usage Instructions

Add the `UndoStack` mixin  and implement a `checkpointData` computed property and a `restoreCheckpoint` function:

```javascript
var Cat = Ember.Object.extend(UndoStack, {
  name: 'Sully',
  color: 'Black',

  checkpointData: function() {
    return {
      name: this.get('name'),
      color: this.get('color')
    }
  }.property('name', 'color'),

  restoreCheckpoint: function(data) {
    this.setProperties({
      name: data.name,
      color: data.color
    });
  }
})
```

The `UndoStack` mixin adds `checkpoint`, `undo` and `redo` functions to your object which can be used as follows:

```javascript
var cat = Cat.create({
  name: 'Sooty',
  color: 'Black'
});

cat.checkpoint();

cat.set('name', 'Hugo');
cat.checkpoint();

cat.undo();
cat.get('name'); // => 'Sooty'

cat.redo();
cat.get('name'); // => 'Hugo'

```

A `throttledCheckpoint` function and `undoCheckpointThrottleInMilliseconds` property are also added.

## TODOs

* [ ] Create a few sample applications
* [ ] Store a diff between checkpoints instead of a copy (https://github.com/intercom/ember-undo-stack/issues/4)

## Development Instructions

* `git clone` this repository
* `npm install`
* `bower install`

### Running

* `ember server`
* Visit your app at http://localhost:4200.
