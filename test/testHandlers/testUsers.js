
var request = require('supertest');
var expect = require('chai').expect;
var async = require('async');
var _ = require('lodash');
var CONSTANTS = require('../../constants');

module.exports = function (db) {

    'use strict';

    var User = db.model('User');
    var PushTokens = db.model('PushTokens');
    var Like = db.model('Like');
    var SearchSettings = db.model('SearchSettings');
    var Contact = db.model('Contact');

    var host = process.env.HOST;
    var userAgent = request.agent(host);

    var badUser1 = {
        coordinates: [12.23, 56]
    };

    var badUser2 = {
        fbId: 'test2',
        coordinates: [182, -95]
    };

    var user1 = {
        fbId: 'test1',
        coordinates: [88.23, 75.66]
    };

    var user2 = {
        fbId: 'test2',
        coordinates: [88, 75]
    };

    var newpushToken = "12345";
    var newCoordinates = [88, 76];
    var newUserName = 'Gandalf';
    var newAge = 30;
    var newSex = 'Male';
    var newJobTitle = 'wizard';
    var newCoordinates1 = [88, 76];
    var newRelStatus = 'Couple';
    var newSmoker = true;
    var newSexual = 'Any';


    var newSearchDistance = 2500;
    var newRelationShip = [CONSTANTS.SEARCH_REL_STATUSES.COUPLE, CONSTANTS.SEARCH_REL_STATUSES.FAMILY];
    var newAgeRange = {
        min: 28,
        max: 32
    };
    var newSearchSmoker = true;

    var uId1;
    var uId2;

    describe('Test users', function () {

        it('SignUp Bad parameters', function (done) {

            var url = '/signIn';

            userAgent
                .post(url)
                .send(badUser1)
                .end(function (err, res) {

                    if (err) {
                        return done(err);
                    }

                    expect(res.status).to.equals(400);

                    done();
                });

        });

        it('SignIn Bad coordinates', function (done) {
            var url = '/signIn';

            userAgent
                .post(url)
                .send(badUser2)
                .end(function (err, res) {

                    if (err) {
                        return done(err);
                    }

                    expect(res.status).to.equals(400);

                    done();
                });
        });

        it('SignUp user1', function (done) {
            var url = '/signIn';

            userAgent
                .post(url)
                .send(user1)
                .end(function (err, res) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({fbId: user1.fbId})
                        .exec(function (err, resultUser) {
                            var user = resultUser.toJSON();

                            if (err) {
                                return done(err);
                            }

                            uId1 = user._id;

                            expect(user).to.instanceOf(Object);
                            expect(user.loc.coordinates[0]).to.equals(user1.coordinates[0]);
                            expect(user.loc.coordinates[1]).to.equals(user1.coordinates[1]);

                            done(null);
                        });

                    expect(res.status).to.equals(200);
                });
        });

        it('SignUp user2', function (done) {
            var url = '/signIn';

            userAgent
                .post(url)
                .send(user2)
                .end(function (err, res) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({fbId: user2.fbId})
                        .exec(function (err, resultUser) {
                            var user = resultUser.toJSON();

                            if (err) {
                                return done(err);
                            }

                            expect(user).to.instanceOf(Object);
                            expect(user.loc.coordinates[0]).to.equals(user2.coordinates[0]);
                            expect(user.loc.coordinates[1]).to.equals(user2.coordinates[1]);

                            uId2 = user._id;

                            done(null);
                        });

                    expect(res.status).to.equals(200);
                });
        });

        it('SignOut', function (done) {

            var url = '/signOut';

            userAgent
                .post(url)
                .send({deviceId: '122'})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    expect(res.status).to.equals(200);

                    done();
                });
        });

        it('signIn User1', function (done) {

            var url = '/signIn';

            user1.pushToken = newpushToken;
            user1.coordinates[0] = newCoordinates[0];
            user1.coordinates[1] = newCoordinates[1];

            userAgent
                .post(url)
                .send(user1)
                .end(function (err, res) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({fbId: user1.fbId})
                        .exec(function (err, resultUser) {
                            var user = resultUser.toJSON();

                            if (err) {
                                return done(err);
                            }

                            expect(user).to.instanceOf(Object);
                            expect(user.loc.coordinates[0]).to.equals(newCoordinates[0]);
                            expect(user.loc.coordinates[1]).to.equals(newCoordinates[1]);

                            uId1 = user._id;

                            expect(res.status).to.equals(200);

                            done(null)
                        });


                });
        });

        it('Get current user', function (done) {

            var url = '/users/' + uId1.toString();

            userAgent
                .get(url)
                .end(function (err, res) {

                    var user = res.body;

                    if (err) {
                        return done(err);
                    }


                    expect(user).to.instanceOf(Object);
                    expect(user._id.toString()).to.equals(uId1.toString());

                    User.findOne({_id: uId1}, function (err, userModel) {
                        if (err) {
                            return done(err);
                        }

                        expect(userModel.loc.coordinates[0]).to.equals(newCoordinates[0]);
                        expect(userModel.loc.coordinates[1]).to.equals(newCoordinates[1]);

                        done();
                    });


                });

        });

        it('Update user profile', function (done) {
            var updateObj = {
                profile: {
                    name: newUserName,
                    age: newAge,
                    sex: newSex,
                    jobTitle: newJobTitle,
                    relStatus: newRelStatus,
                    smoker: newSmoker,
                    sexual: newSexual
                },
                coordinates: newCoordinates1
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(200, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.profile.name).to.equals(newUserName);
                            expect(resultUser.profile.age).to.equals(newAge);
                            expect(resultUser.profile.sex).to.equals(newSex);
                            expect(resultUser.profile.jobTitle).to.equals(newJobTitle);
                            expect(resultUser.loc.coordinates[0]).to.equals(newCoordinates1[0]);
                            expect(resultUser.loc.coordinates[1]).to.equals(newCoordinates1[1]);

                            done();
                        });

                });

        });

        it('Update only user coordinates', function (done) {
            var updateObj = {
                coordinates: newCoordinates1
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(200, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.loc.coordinates[0]).to.equals(newCoordinates1[0]);
                            expect(resultUser.loc.coordinates[1]).to.equals(newCoordinates1[1]);

                            done();
                        });
                });
        });

        it('Update user: bad age parameter', function (done) {
            var updateObj = {
                profile: {
                    age: 450
                }
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(400, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.profile.age).to.not.equals(450);

                            done();
                        });
                });
        });

        it('Update user: bad smoker parameter', function (done) {
            var updateObj = {
                profile: {
                    smoker: 'false'
                }
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(400, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.profile.smoker).to.not.equals('false');

                            done();
                        });
                });
        });

        it('Update user: bad sex parameter', function (done) {
            var updateObj = {
                profile: {
                    sex: 'M'
                }
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(400, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.profile.sex).to.not.equals('M');

                            done();
                        });
                });
        });

        it('Update user: bad sexual parameter', function (done) {
            var updateObj = {
                profile: {
                    sexual: 'Straight123'
                }
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(400, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.profile.sexual).to.not.equals('Straight123');

                            done();
                        });
                });
        });

        it('Update user: bad relStatus parameter', function (done) {
            var updateObj = {
                profile: {
                    relStatus: 'Single123'
                }
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(400, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.profile.relStatus).to.not.equals('Single123');

                            done();
                        });
                });
        });

        it('Update user: bad visible parameter', function (done) {
            var updateObj = {
                profile: {
                    visible: 'true'
                }
            };

            var url = '/users';

            userAgent
                .put(url)
                .send(updateObj)
                .expect(400, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId1}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.instanceOf(Object);
                            expect(resultUser.profile.visible).to.not.equals('true');

                            done();
                        });
                });
        });

        it('User1 likes User2', function (done) {
            var model;
            var url = '/users/like/' + uId2.toString();

            userAgent
                .get(url)
                .expect(200, function (err) {

                    if (err) {
                        return done(err);
                    }

                    Like.findOne({user: uId1}, function (err, resultModel1) {

                        if (err) {
                            return done(err);
                        }

                        model = resultModel1.toJSON();

                        expect(model).to.instanceOf(Object);
                        expect(model.likes).to.instanceOf(Array);
                        expect(model.likes.length).to.equals(1);
                        expect(model.likes[0]).to.equals(uId2.toString());

                        done(null);

                    });
                });
        });

        it('signIn User2', function (done) {

            var url = '/signIn';

            user2.pushToken = newpushToken;
            user2.coordinates[0] = newCoordinates[0];
            user2.coordinates[1] = newCoordinates[1];

            userAgent
                .post(url)
                .send(user2)
                .end(function (err, res) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({fbId: user2.fbId})
                        .exec(function (err, resultUser) {
                            var user = resultUser.toJSON();

                            if (err) {
                                return done(err);
                            }

                            expect(user).to.instanceOf(Object);
                            expect(user.loc.coordinates[0]).to.equals(newCoordinates[0]);
                            expect(user.loc.coordinates[1]).to.equals(newCoordinates[1]);

                            expect(res.status).to.equals(200);

                            done(null);

                        });
                });
        });

        it('User2 get search settings', function (done) {
            var url = '/users/searchSettings/';

            userAgent
                .get(url)
                .expect(200, function (err, res) {

                    if (err) {
                       return done(err);
                    }

                    var settings = res.body;

                    expect(settings).to.instanceOf(Object);
                    expect(settings.distance).to.equals(500);
                    expect(settings.sexual).to.equals('Any');
                    expect(settings.ageRange).to.instanceOf(Object);
                    expect(settings.ageRange.min).to.equals(25);
                    expect(settings.ageRange.max).to.equals(40);

                    done(null);
                });
        });

        it('User2 change search settings', function (done) {

            var url = '/users/searchSettings/';
            var updateObj = {
                distance: newSearchDistance,
                relationship: newRelationShip,
                ageRange: newAgeRange,
                smoker: newSearchSmoker
            };

            userAgent
                .put(url)
                .send(updateObj)
                .expect(200, function (err) {

                    if (err) {
                        return done(err);
                    }

                    SearchSettings
                        .findOne({user: uId2}, function (err, resultSettings) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultSettings).to.instanceOf(Object);
                            expect(resultSettings.distance).to.equals(newSearchDistance * 1609.344);
                            expect(resultSettings.relationship).to.instanceOf(Array);
                            expect(resultSettings.relationship.length).to.equals(2);
                            expect(resultSettings.relationship[0]).to.equals(newRelationShip[0]);
                            expect(resultSettings.relationship[1]).to.equals(newRelationShip[1]);
                            expect(resultSettings.ageRange).to.instanceOf(Object);
                            expect(resultSettings.ageRange.min).to.equals(newAgeRange.min);
                            expect(resultSettings.ageRange.max).to.equals(newAgeRange.max);

                            done(null);

                        });


                });

        });

        it('User2 find User1', function(done){

            var url = '/users/find/1';
            var resultUsers;

            userAgent
                .get(url)
                .expect(200, function(err, res){

                    if (err){
                        return done(err);
                    }

                    resultUsers = res.body;

                    expect(resultUsers).to.instanceOf(Array);
                    expect(resultUsers.length).to.equals(1);
                    expect(resultUsers[0]).to.instanceOf(Object);

                    done(null);
                });

        });

        it('User2 likes User1', function (done) {
            var model;
            var url = '/users/like/' + uId1.toString();

            userAgent
                .get(url)
                .expect(200, function (err) {

                    if (err) {
                        return done(err);
                    }

                    Like.findOne({user: uId2}, function (err, resultModel) {

                        if (err) {
                            return done(err);
                        }

                        model = resultModel.toJSON();

                        expect(model).to.instanceOf(Object);
                        expect(model.likes).to.instanceOf(Array);
                        expect(model.likes.length).to.equals(1);
                        expect(model.likes[0]).to.equals(uId1.toString());

                        Contact
                            .find({$or: [{userId: uId2, friendId: uId1}, {userId: uId1, friendId: uId2}]}, function(err, resultFriends){

                                if (err){
                                    return done(err);
                                }

                                expect(resultFriends).to.instanceof(Array);
                                expect(resultFriends.length).to.equals(2);

                                done();

                            });

                    });

                });
        });

        it('User2 have one friend user1', function(done){
            var url = '/users/friendList/1';

            userAgent
                .get(url)
                .expect(200, function(err, res){
                    if (err){
                        return done(err);
                    }
                    expect(res.body).to.instanceOf(Array);
                    expect(res.body[0]).to.instanceOf(Object);
                    expect(res.body[0].friendId).to.equals(uId1.toString());

                    done(null);
                })
        });

        it('User2 block friend user1', function(done){
            var url = '/users/blockFriend/' + uId1.toString();

            userAgent
                .get(url)
                .expect(200, function(err){
                    if (err){
                        return done(err);
                    }

                    User
                        .findOne({_id:uId2}, function(err, user2Model){
                            var friendList;
                            var blockList;

                            if (err){
                                return done(err);
                            }


                            blockList = user2Model.get('blockList');


                            expect(blockList.indexOf(uId1.toString())).not.to.equals(-1);

                            Contact
                                .find({$or: [{userId: uId2, friendId: uId1}, {userId: uId1, friendId: uId2}]}, function(err, friendModel){

                                    if (err){
                                        return done(err);
                                    }

                                    expect(friendModel).to.instanceof(Array);
                                    expect(friendModel.length).to.equals(0);

                                    done(null);

                                });
                        })
                })
        });

        it('Delete User', function (done) {

            var url = '/users/';

            userAgent
                .delete(url)
                .expect(200, function (err) {

                    if (err) {
                        return done(err);
                    }

                    User
                        .findOne({_id: uId2}, function (err, resultUser) {

                            if (err) {
                                return done(err);
                            }

                            expect(resultUser).to.equals(null);

                            PushTokens
                                .findOne({user: uId2}, function (err, resultToken) {

                                    if (err) {
                                        return done(err);
                                    }

                                    expect(resultToken).to.equals(null);

                                    done();

                                });
                        });

                });
        });
    });
};