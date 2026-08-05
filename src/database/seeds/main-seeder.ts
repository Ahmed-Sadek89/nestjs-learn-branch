import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Client } from 'src/client/entities/client.entity';
import { Profile } from 'src/profile/entities/profile.entity';
import { Post } from 'src/post/entities/post.entity';

export default class MainSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const clientFactory = factoryManager.get(Client);
    const profileFactory = factoryManager.get(Profile);
    const postFactory = factoryManager.get(Post);
    const clientRepo = dataSource.getRepository(Client);
    const existing = await clientRepo.count();
    // if (existing > 0) {
    //   console.log(`Skip seed — ${existing} client(s) already exist`);
    //   return;
    // }

    // 1) Clients (users)
    const clients = await Promise.all(
      Array.from({ length: 50 }, () => clientFactory.save()),
    );

    // 2) One Profile per Client (1:1)
    const profiles: Profile[] = [];
    for (const client of clients) {
      const profile = await profileFactory.save({ client });
      profiles.push(profile);
    }

    // 3) Posts: ManyToOne Client + Profile
    let postCount = 0;
    for (let i = 0; i < profiles.length; i++) {
      const client = clients[i];
      const profile = profiles[i];
      for (let j = 0; j < 6; j++) {
        await postFactory.save({ client, profile });
        postCount += 1;
      }
    }

    console.log(
      `Seeded ${clients.length} clients, ${profiles.length} profiles, ${postCount} posts`,
    );
  }
}
