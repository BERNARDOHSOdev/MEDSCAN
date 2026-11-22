const { test } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { updateProfile } = require('./profileController');

test('an explicitly cleared age is saved as null rather than silently ignored', async () => {
  const original = { update: User.findByIdAndUpdate, get: User.findById, profile: Profile.findOneAndUpdate };
  let update;
  User.findByIdAndUpdate = async (_id, data) => { update = data; };
  User.findById = () => ({ select: async () => ({ age: null }) });
  Profile.findOneAndUpdate = async () => ({});
  try {
    let body;
    await updateProfile({ user: { _id: 'owner' }, body: { name: 'Pessoa', age: null } }, { json(value) { body = value; return this; } }, error => { throw error; });
    assert.equal(update.age, null); assert.equal(body.user.age, null);
  } finally { User.findByIdAndUpdate = original.update; User.findById = original.get; Profile.findOneAndUpdate = original.profile; }
});
