import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Profile } from 'src/profile/entities/profile.entity';

export default setSeederFactory(Profile, () => {
  const profile = new Profile();
  profile.bio = faker.person.bio().slice(0, 50);
  return profile;
});
