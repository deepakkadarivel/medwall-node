const neo4j = require('neo4j-driver').v1;
const uuidv1 = require('uuid/v1');
const config = require('../../config/env/development');
const constants = require('../constants/constants');
const crypt = require('../auth/crypt');
const jwt = require('../auth/jwt');
const query = require('../../app/neo/nodes/person');

const driver = neo4j.driver(config.neoSandbox, neo4j.auth.basic(config.neoUserSandbox, config.neoUserPasswordSandbox));

const getData = (fetchQuery, params, property) => {
    let session = driver.session();
    let response = session.run(fetchQuery, params)
        .then(result => {
            return result.records.map(record => {
                return record.get(property).properties
            })
        });
    return response;
    session.close();
};

const putData = (mutateQuery, params) => {
    params.id = uuidv1();
    let session = driver.session();
    let response = session.run(mutateQuery, params)
        .then(result => {
            return result.records.map(record => {
                return record._fields[0].properties
            })
        });
    return response;
    session.close();
};

const createRelation = (relateQuery, params) => {
    let session = driver.session();
    session.run(relateQuery, params);
    session.close();
};

module.exports = {
    Query: {
        async allPersons(_, params, access_token) {
            if (access_token.access_token.isTokenValid) {
                let persons = await getData(query.ALL_PERSONS, params, "person");
                return {status: constants.success, message: constants.success, persons};
            } else {
                return {status: constants.unauthorized, message: constants.invalid_token};
            }
        },
        async authenticatePerson(_, params) {
            let persons = await getData(query.PERSON_BY_EMAIL, params, "person");
            if (persons.length) {
                if (!crypt.validPassword(params.password, persons[0].password)) {
                    return {authenticated: false, message: constants.invalid_login};
                } else {
                    const access_token = jwt.generateAccessTokenFrom(persons[0].id);
                    return {authenticated: true, message: constants.login_successful, access_token};
                }
            } else {
                return {authenticated: false, message: constants.invalid_login};
            }
        },
        async allRecords(_, params, access_token) {
            if (access_token.access_token.isTokenValid) {
                let records = await getData(query.ALL_RECORDS, params, "record");
                return {status: constants.success, message: constants.success, records};
            } else {
                return {status: constants.unauthorized, message: constants.invalid_token};
            }
        },
        async personById(_, params, access_token) {
            if (access_token.access_token.isTokenValid) {
                let persons = await getData(query.PERSON_BY_ID, params, "person");
                return {status: constants.success, message: constants.success, persons};
            } else {
                return {status: constants.unauthorized, message: constants.invalid_token};
            }
        },
    },

    Mutation: {
        createPerson: async (_, params) => {
            const password_hash = crypt.generateHash(params.password);
            params.password = password_hash;
            return await putData(query.CREATE_PERSON, params);
        },
        createRecord: async (_, params, access_token) => {
            let id = access_token.access_token.value;
            params.uploadedBy = id;
            let records = await putData(query.CREATE_RECORD, params);
            await createRelation(query.RELATE_RECORD, {id, recordId: records[0].id});
            return records;
        },
    }
};