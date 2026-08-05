import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Post } from 'src/post/entities/post.entity';

export default setSeederFactory(Post, () => {
  const post = new Post();
  post.title = faker.lorem.sentence({ min: 2, max: 5 }).slice(0, 50);
  post.description = faker.lorem.paragraphs(2);
  return post;
});
