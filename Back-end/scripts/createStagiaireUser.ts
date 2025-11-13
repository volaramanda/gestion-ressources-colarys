// scripts/createStagiaireUser.ts
import { AppDataSource } from "../src/config/data-source";
import { User } from "../src/entities/User";
import bcrypt from "bcryptjs";

async function createUser() {
  await AppDataSource.initialize();
  
  const userRepo = AppDataSource.getRepository(User);
  
  const existingUser = await userRepo.findOneBy({ email: "stagiaire.vola@gmail.com" });
  if (existingUser) {
    console.log("L'utilisateur existe déjà");
    await AppDataSource.destroy();
    return;
  }

  const user = new User();
  user.name = "Stagiaire Vola";
  user.email = "stagiaire.vola@gmail.com";
  user.password = await bcrypt.hash("stage25", 10);
  user.role = "admin"; // ou "admin" selon les besoins

  await userRepo.save(user);
  console.log("Utilisateur créé avec succès");

  await AppDataSource.destroy();
}

createUser().catch(console.error);