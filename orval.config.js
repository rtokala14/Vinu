module.exports = {
  apispec: {
    output: {
      mode: 'tags-split',
      target: './api/queries',
      schemas: './api/models',
      client: 'react-query',
      override: {
        mutator: {
          path: './api/custom-axios.ts',
          name: 'customAxios',
        },
      },
    },
    input: {
      target: './openapi-spec.json',
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
};
