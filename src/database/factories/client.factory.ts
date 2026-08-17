import { setSeederFactory } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { Client } from 'src/client/entities/client.entity';

export default setSeederFactory(Client, () => {
  const client = new Client();
  client.name = faker.person.fullName().slice(0, 50);
  client.email = faker.internet.email().toLowerCase().slice(0, 50);
  client.password = "password123";
  return client;
});
