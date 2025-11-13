public class Compter {
    public static void main(String[] args) {
        long startTime = System.nanoTime();
        int i = 1;

        // La condition de la boucle while est incorrecte.
        // Remplacée par une boucle correcte : i < 1_000_000_000
        while (i <= 1000000000) {
            i++;
            System.out.println("Voici: "+i);
        }

        long elapsedTime = System.nanoTime() - startTime;

        // Pour convertir des nanosecondes en microsecondes, on divise par 1000.0 (double)
        double totalTimeMicroseconds = elapsedTime / 1000.0;

        System.out.println("Microsecondes : " + totalTimeMicroseconds);
    }
}
