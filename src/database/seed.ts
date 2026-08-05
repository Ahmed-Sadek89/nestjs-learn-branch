import { runSeeders } from "typeorm-extension";
import { AppDataSource } from "./data-source";


async function main() {
    await AppDataSource.initialize();
    try {
        await runSeeders(AppDataSource);
        console.log('Database seeding completed');
    } finally {
        await AppDataSource.destroy();
    }
}

main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});