const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        content: String!
        creator: User!
        imageUrl: String!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]
    }

    type AuthData {
        token: String!
        userId: String!
    }

    type PostData {
        message: String!
        posts: [Post!],
        totalPosts: Int!
    }
    
    input UserInputData {
        email: String!
        name: String!
        password: String!
    }

    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData
        posts(page: Int!): PostData
        post(postId: ID!): Post!
        user: User!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(postId: ID!, postInput: PostInputData): Post!
        deletePost(postId: ID!): Boolean!
        updateStatus(statusInput: String!): String!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
