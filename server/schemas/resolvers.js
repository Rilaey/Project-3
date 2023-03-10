const { User, Post, Tag } = require('../models');
const {GraphQLScalarType, Kind} = require('graphql');

const resolvers = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value) {
      if (value instanceof Date) {
        return value.getTime(); // Convert outgoing Date to integer for JSON
      }
      throw Error('GraphQL Date Scalar serializer expected a `Date` object');
    },
    parseValue(value) {
      if (typeof value === 'number') {
        return new Date(value); // Convert incoming integer to Date
      }
      throw new Error('GraphQL Date Scalar parser expected a `number`');
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        // Convert hard-coded AST string to integer and then to Date
        return new Date(parseInt(ast.value, 10));
      }
      // Invalid hard-coded value (not an integer)
      return null;
    },
  }),
  Query: {
    user: async (parent, { id }) => {
      return await User.findById(id).populate('posts').populate('comments');
    },
    users: async () => {
      return await User.find();
    },
    getTagById: async (parent, { tagId }) => {
      const tag = await Tag.findById(tagId);
      return tag;
    },
    getAllTags: async () => {
      const tags = await Tag.find();
      return tags;
    },
    posts: async () => {
      try {
        const posts = await Post.find().populate('user');
        return posts;
      } catch (err) {
        console.log(err);
      }

    },
    post: async (parent, { id }) => {
      const post = await Post.findById(id).populate('user');
      return post;
    },
    getComment: async (_, { id }) => {
      try {
        const comment = await Comment.findById(id);
        return comment;
      } catch (err) {
        console.error(err);
      }
    },
    getAllComments: async () => {
      try {
        const comments = await Comment.find();
        return comments;
      } catch (err) {
        console.error(err);
      }
    },
  },
  Mutation: {
    createUser: async (parent, { input }) => {
      const user = new User(input);
      await user.save();
      return user;
    },
    updateUser: async (parent, { id, input }) => {
      const user = await User.findByIdAndUpdate(id, input, { new: true });
      return user;
    },
    deleteUser: async (parent, { id }) => {
      const user = await User.findByIdAndRemove(id);
      return user;
    },
    addProfilePicture: async (parent, { id, input }) => {
      const user = await User.findById(id);
      user.profilePicture = input;
      await user.save();
      return user;
    },
    createTag: async (parent, { tagname }) => {
      const tag = new Tag({ tagname });
      await tag.save();
      return tag;
    },
    deleteTag: async (parent, { tagId }) => {
      try {
        const tag = await Tag.findByIdAndDelete(tagId);
        if (!tag) {
          return {
            success: false,
            message: "Tag not found"
          };
        }
        return {
          success: true,
          message: "Tag deleted successfully"
        };
      } catch (err) {
        return {
          success: false,
          message: err.message
        };
      }
    },
    updateTag: async (parent, { tagId, tagname }) => {
      try {
        const tag = await Tag.findByIdAndUpdate(
          tagId,
          { tagname },
          { new: true }
        );
        if (!tag) {
          return {
            success: false,
            message: "Tag not found"
          };
        }
        return {
          success: true,
          message: "Tag updated successfully",
          tag
        };
      } catch (err) {
        return {
          success: false,
          message: err.message
        };
      }
    },
    createPost: async (parent, args) => {
      const { title, description, price, tags } = args;
      const post = new Post({
        title,
        description,
        price,
        tags,
      });
      await post.save();
      return post;
    },
    updatePost: async (parent, args) => {
      const { id, title, description, price, tags } = args;
      const updatedPost = await Post.findByIdAndUpdate(
        id,
        { title, description, price, tags },
        { new: true }
      );
      return updatedPost;
    },
    deletePost: async (parent, { id }) => {
      const deletedPost = await Post.findByIdAndDelete(id);
      return deletedPost;
    },
    createComment: async (_, { commentText, postId }, { user }) => {
      if (!user) {
        throw new AuthenticationError("You must be logged in to create a comment.");
      }

      try {
        const post = await Post.findById(postId);

        if (!post) {
          throw new Error("No post with that id found.");
        }

        const newComment = new Comment({
          commentText,
          commentAuthor: user.id,
          createdAt: Date.now(),
        });

        await newComment.save();
        post.comments.push(newComment);
        await post.save();

        return newComment;
      } catch (err) {
        console.error(err);
      }
    },
    deleteComment: async (_, { id }, { user }) => {
      if (!user) {
        throw new AuthenticationError("You must be logged in to delete a comment.");
      }

      try {
        const comment = await Comment.findById(id);

        if (!comment) {
          throw new Error("No comment with that id found.");
        }

        if (comment.commentAuthor.toString() !== user.id) {
          throw new AuthenticationError("You can only delete your own comments.");
        }

        await comment.remove();

        return comment;
      } catch (err) {
        console.error(err);
      }
    },
    updateComment: async (_, { id, commentText }, { user }) => {
      if (!user) {
        throw new AuthenticationError("You must be logged in to update a comment.");
      }

      try {
        const comment = await Comment.findById(id);

        if (!comment) {
          throw new Error("No comment with that id found.");
        }

        if (comment.commentAuthor.toString() !== user.id) {
          throw new AuthenticationError("You can only update your own comments.");
        }

        comment.commentText = commentText;
        comment.createdAt = Date.now();

        await comment.save();

        return comment;
      } catch (err) {
        console.error(err);
      }
    },
  },
  Tag: {
    posts: async (tag) => {
      const posts = await Post.find({ tags: tag.id });
      return posts;
    },
  },
  User: {
    posts: async (user) => {
      const posts = await Post.find({ user: user.id });
      return posts;
    },
    comments: async (parent) => {
      return await Comment.find({ commentAuthor: parent.id });
    },
  },
  Post: {
    user: async (post) => {
      return await User.findById(post.user);
    },
    comments: async (parent) => {
      return await Comment.find({ post: parent.id });
    },
  },
  Comment: {
    commentAuthor: async (parent) => {
      try {
        const user = await User.findById(parent.commentAuthor);
        return user;
      } catch (err) {
        console.error(err);
      }
    },
    post: async (comment) => {
      const post = await Post.findById(comment.post);
      return post;
    },
  },
};

module.exports = resolvers;
