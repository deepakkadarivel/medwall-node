const neo4j = require('neo4j-driver').v1;
const uuidv1 = require('uuid/v1');
const config = require('../../config/env/development');
const constants = require('../constants/constants');
const crypt = require('../auth/crypt');
const jwt = require('../auth/jwt');
const query = require('../../app/neo/nodes/person');

const driver = neo4j.driver(config.neoSandbox, neo4j.auth.basic(config.neoUserSandbox, config.neoUserPasswordSandbox));

module.exports = {
    Query: {
        allPersons(_, params) {
            let session = driver.session();
            return session.run(query.ALL_PERSONS, params)
                .then(result => {
                    return result.records.map(record => {
                        return record.get("person").properties
                    })
                });
            session.close();
        },
        authenticatePerson(_, params) {
            let session = driver.session();
            return session.run(query.AUTHENTICATE_PERSON, params)
                .then(result => {
                    let persons = result.records.map(record => {
                        return record.get("person").properties
                    });
                    if (persons.length) {
                        if (!crypt.validPassword(params.password, persons[0].password)) {
                            return {authenticated: false, message: constants.invalid_login};
                        } else {
                            const access_token = jwt.generateAccessTokenFrom(params.email);
                            return {authenticated: true, message: constants.login_successful, access_token};
                        }
                    } else {
                        return {authenticated: false, message: constants.invalid_login};
                    }
                });
            session.close();
        },
        allRecords(_, params) {
            let session = driver.session();
            return session.run(query.ALL_RECORDS, params)
                .then(result => {
                    return result.records.map(record => {
                        return record.get("record").properties
                    })
                });
            session.close();
        },
    },

    Mutation: {
        createPerson: (_, params) => {
            const password_hash = crypt.generateHash(params.password);
            params.password = password_hash;
            params.id = uuidv1();
            let session = driver.session();
            return session.run(query.CREATE_PERSON, params)
                .then(result => {
                    return result.records.map(record => {
                        return record._fields[0].properties
                    })
                });
            session.close();
        },
        createRecord: (_, params) => {
            params.id = uuidv1();
            let session = driver.session();
            return session.run(query.CREATE_RECORD, params)
                .then(result => {
                    return result.records.map(record => {
                        return record._fields[0].properties
                    })
                });
            session.close();
        }
    }
};